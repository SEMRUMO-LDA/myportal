/**
 * Calendar Integration Service
 * Handles synchronization with Google Calendar, Outlook, and iCal exports
 */

import { Leave, User, LeaveType } from '../types';

// ============================================
// ICS (iCalendar) GENERATION
// ============================================

/**
 * Generate an ICS file content for a set of leaves
 */
export const generateICS = (
    leaves: Leave[],
    user: User,
    leaveTypes: LeaveType[]
): string => {
    const escapeICS = (str: string) => {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    };

    const formatDateICS = (dateStr: string, allDay: boolean = true): string => {
        const date = new Date(dateStr);
        if (allDay) {
            return date.toISOString().split('T')[0].replace(/-/g, '');
        }
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Add one day to end date for all-day events (iCal specification)
    const getEndDateForAllDay = (dateStr: string): string => {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + 1);
        return formatDateICS(date.toISOString().split('T')[0]);
    };

    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MYPORTAL//Gestao de Ausencias//PT
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Férias - ${escapeICS(user.name)}
X-WR-TIMEZONE:Europe/Lisbon
`;

    leaves.forEach((leave) => {
        const leaveType = leaveTypes.find(lt => lt.id === leave.leaveTypeId);
        const typeName = leaveType?.name || 'Ausência';
        const uid = `leave-${leave.id}@myportal.local`;
        const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const summary = `${typeName} - ${user.name}`;
        const description = leave.notes
            ? escapeICS(`${typeName}\\n\\nNotas: ${leave.notes}`)
            : escapeICS(`Período de ${typeName.toLowerCase()} aprovado`);

        ics += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART;VALUE=DATE:${formatDateICS(leave.startDate)}
DTEND;VALUE=DATE:${getEndDateForAllDay(leave.endDate)}
SUMMARY:${escapeICS(summary)}
DESCRIPTION:${description}
STATUS:${leave.status === 'APPROVED' ? 'CONFIRMED' : leave.status === 'PENDING' ? 'TENTATIVE' : 'CANCELLED'}
TRANSP:OPAQUE
X-MICROSOFT-CDO-BUSYSTATUS:OOF
END:VEVENT
`;
    });

    ics += 'END:VCALENDAR';
    return ics;
};

/**
 * Download ICS file for user's leaves
 */
export const downloadICS = (
    leaves: Leave[],
    user: User,
    leaveTypes: LeaveType[],
    filename?: string
): void => {
    const ics = generateICS(leaves, user, leaveTypes);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `ferias_${user.name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

interface GoogleCalendarEventParams {
    title: string;
    startDate: string;
    endDate: string;
    description?: string;
    location?: string;
}

/**
 * Generate Google Calendar URL for adding an event
 */
export const getGoogleCalendarUrl = (params: GoogleCalendarEventParams): string => {
    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toISOString().split('T')[0].replace(/-/g, '');
    };

    // Add one day to end for all-day events
    const getEndDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + 1);
        return formatDate(date.toISOString().split('T')[0]);
    };

    const baseUrl = 'https://calendar.google.com/calendar/render';
    const queryParams = new URLSearchParams({
        action: 'TEMPLATE',
        text: params.title,
        dates: `${formatDate(params.startDate)}/${getEndDate(params.endDate)}`,
        details: params.description || '',
        location: params.location || '',
        sf: 'true',
        output: 'xml'
    });

    return `${baseUrl}?${queryParams.toString()}`;
};

/**
 * Open Google Calendar to add a leave event
 */
export const addToGoogleCalendar = (
    leave: Leave,
    user: User,
    leaveTypes: LeaveType[]
): void => {
    const leaveType = leaveTypes.find(lt => lt.id === leave.leaveTypeId);
    const typeName = leaveType?.name || 'Ausência';

    const url = getGoogleCalendarUrl({
        title: `${typeName} - ${user.name}`,
        startDate: leave.startDate,
        endDate: leave.endDate,
        description: leave.notes
            ? `${typeName}\n\nNotas: ${leave.notes}\n\nStatus: ${leave.status}`
            : `Período de ${typeName.toLowerCase()} - ${leave.status}`
    });

    window.open(url, '_blank', 'noopener,noreferrer');
};

// ============================================
// OUTLOOK CALENDAR INTEGRATION
// ============================================

/**
 * Generate Outlook Web Calendar URL for adding an event
 */
export const getOutlookCalendarUrl = (params: GoogleCalendarEventParams): string => {
    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toISOString().split('T')[0];
    };

    // Add one day to end for all-day events
    const getEndDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + 1);
        return formatDate(date.toISOString().split('T')[0]);
    };

    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const queryParams = new URLSearchParams({
        subject: params.title,
        startdt: formatDate(params.startDate),
        enddt: getEndDate(params.endDate),
        body: params.description || '',
        location: params.location || '',
        allday: 'true',
        path: '/calendar/action/compose',
        rru: 'addevent'
    });

    return `${baseUrl}?${queryParams.toString()}`;
};

/**
 * Open Outlook Web to add a leave event
 */
export const addToOutlookCalendar = (
    leave: Leave,
    user: User,
    leaveTypes: LeaveType[]
): void => {
    const leaveType = leaveTypes.find(lt => lt.id === leave.leaveTypeId);
    const typeName = leaveType?.name || 'Ausência';

    const url = getOutlookCalendarUrl({
        title: `${typeName} - ${user.name}`,
        startDate: leave.startDate,
        endDate: leave.endDate,
        description: leave.notes
            ? `${typeName}\n\nNotas: ${leave.notes}\n\nStatus: ${leave.status}`
            : `Período de ${typeName.toLowerCase()} - ${leave.status}`
    });

    window.open(url, '_blank', 'noopener,noreferrer');
};

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Add all approved leaves to Google Calendar (opens multiple tabs)
 * Note: Consider rate limiting or combining into single ICS download
 */
export const addAllToGoogleCalendar = (
    leaves: Leave[],
    user: User,
    leaveTypes: LeaveType[]
): void => {
    const approvedLeaves = leaves.filter(l => l.status === 'APPROVED');

    if (approvedLeaves.length === 0) {
        console.warn('No approved leaves to add');
        return;
    }

    // For multiple leaves, it's better to download ICS
    if (approvedLeaves.length > 3) {
        downloadICS(approvedLeaves, user, leaveTypes);
        return;
    }

    // Open each in new tab (limited to avoid popup blockers)
    approvedLeaves.forEach((leave, index) => {
        // Stagger openings to avoid popup blocking
        setTimeout(() => {
            addToGoogleCalendar(leave, user, leaveTypes);
        }, index * 500);
    });
};

// ============================================
// SYNC CALLBACK (for post-approval automation)
// ============================================

export interface CalendarSyncConfig {
    enabled: boolean;
    provider: 'google' | 'outlook' | 'ics' | 'none';
    autoSync: boolean;
    notifyUser: boolean;
}

/**
 * Called when a leave is approved to trigger calendar sync
 * This is a frontend-only implementation - for full bidirectional sync,
 * you would need OAuth integration on the backend
 */
export const syncApprovedLeave = async (
    leave: Leave,
    user: User,
    leaveTypes: LeaveType[],
    config: CalendarSyncConfig
): Promise<{ success: boolean; message: string }> => {
    if (!config.enabled || config.provider === 'none') {
        return { success: true, message: 'Sync disabled' };
    }

    if (leave.status !== 'APPROVED') {
        return { success: false, message: 'Leave not approved' };
    }

    try {
        switch (config.provider) {
            case 'google':
                addToGoogleCalendar(leave, user, leaveTypes);
                return { success: true, message: 'Opened Google Calendar' };

            case 'outlook':
                addToOutlookCalendar(leave, user, leaveTypes);
                return { success: true, message: 'Opened Outlook Calendar' };

            case 'ics':
                downloadICS([leave], user, leaveTypes);
                return { success: true, message: 'ICS file downloaded' };

            default:
                return { success: false, message: 'Unknown provider' };
        }
    } catch (error) {
        console.error('Calendar sync error:', error);
        return { success: false, message: 'Sync failed' };
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate number of business days between two dates
 */
export const getBusinessDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    let count = 0;

    const current = new Date(start);
    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
};

/**
 * Check if two date ranges overlap
 */
export const datesOverlap = (
    start1: string, end1: string,
    start2: string, end2: string
): boolean => {
    const s1 = new Date(start1 + 'T00:00:00');
    const e1 = new Date(end1 + 'T00:00:00');
    const s2 = new Date(start2 + 'T00:00:00');
    const e2 = new Date(end2 + 'T00:00:00');

    return s1 <= e2 && e1 >= s2;
};

/**
 * Get the number of days in advance a leave request was made
 */
export const getAdvanceDays = (leaveStartDate: string, createdAt?: string): number => {
    const startDate = new Date(leaveStartDate + 'T00:00:00');
    const requestDate = createdAt ? new Date(createdAt) : new Date();

    const diffTime = startDate.getTime() - requestDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};
