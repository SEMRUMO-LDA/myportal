import React from 'react';
import EmployeeVacations from './EmployeeVacations';
import { User, LeaveType, Leave, ScheduleTemplate } from '../types';

interface RequestLeaveProps {
    user: User;
    users?: User[];
    leaveTypes: LeaveType[];
    leaves: Leave[];
    onAddLeave?: (leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean | void> | void;
    scheduleTemplates?: ScheduleTemplate[];
    kioskMode?: boolean;
}

/**
 * Unified alias for RequestLeave -> redirects to the integrated EmployeeVacations component with defaultTab="request"
 */
const RequestLeave: React.FC<RequestLeaveProps> = (props) => {
    return <EmployeeVacations {...props} defaultTab="request" />;
};

export default RequestLeave;
