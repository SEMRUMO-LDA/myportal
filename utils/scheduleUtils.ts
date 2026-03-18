import { User, ScheduleTemplate, ScheduleTemplateDay } from '../types';

export const getEffectiveScheduleDay = (
    date: Date,
    user: User,
    template: ScheduleTemplate | undefined
): ScheduleTemplateDay | undefined => {
    if (!template) return undefined;

    // A. Cyclical Schedule (Rotating)
    if (template.cycleDays && template.cyclePattern && template.cyclePattern.length > 0) {
        if (!user.scheduleCycleStartDate) return undefined; // Cannot calculate without anchor

        const cycleStart = new Date(user.scheduleCycleStartDate);
        // Reset times to midnight for accurate day diff
        cycleStart.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - cycleStart.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return undefined; // Date before cycle start

        // Cycle index is 0-based remainder. 
        // Example: 4 days cycle. diffDays=0 -> index 0 (Day 1). diffDays=3 -> index 3 (Day 4). diffDays=4 -> index 0.
        const cycleIndex = diffDays % template.cycleDays;

        // Find pattern for this index (pattern uses 1-based dayIndex usually, let's normalize to matching logic)
        // In Types/UI we used dayIndex (1..N). So cycleIndex + 1.
        const dayPattern = template.cyclePattern.find(p => p.dayIndex === cycleIndex + 1);

        if (dayPattern) {
            return {
                day: date.getDay(), // Just for compat, though it's rotating
                start: dayPattern.start,
                end: dayPattern.end,
                breakStart: dayPattern.breakStart,
                breakEnd: dayPattern.breakEnd,
                isOff: dayPattern.isOff
            };
        }
        return undefined;
    }

    // B. Weekly Schedule (Fixed)
    const dayOfWeek = date.getDay(); // 0=Sunday
    const dayPattern = template.weeklyPattern.find(p => p.day === dayOfWeek);
    return dayPattern;
};

export const formatHoursHumanized = (hours: number | undefined): string => {
    if (hours === undefined || hours === null || isNaN(hours)) return '—';

    const isNegative = hours < 0;
    const absHours = Math.abs(hours);
    const totalMinutes = Math.round(absHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    // For zero hours, don't show sign
    if (totalMinutes === 0) return '0h 00m';

    // Only show sign for non-zero values where it makes sense (like in hour bank)
    const sign = isNegative ? '-' : '';

    // Format with padded zeros for consistency
    return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
};
