import { Holiday, User, ScheduleTemplate } from '../types';
import { getEffectiveScheduleDay } from './scheduleUtils';

/**
 * Calculates Easter Sunday for any given year using the Anonymous Gregorian / Meeus-Jones-Butcher algorithm.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Helper to format a Date as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD string into a safe local midnight Date (avoiding UTC timezone shift)
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d, 0, 0, 0, 0);
}

/**
 * Returns standard Portuguese mandatory national holidays for a given year.
 */
export function getPortugueseNationalHolidays(year: number): { date: string; name: string; type: 'National' }[] {
  const easter = getEasterSunday(year);

  // Sexta-feira Santa: 2 days before Easter
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  // Corpo de Deus: 60 days after Easter (Thursday)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);

  const holidays = [
    { date: `${year}-01-01`, name: 'Ano Novo', type: 'National' as const },
    { date: formatDateKey(goodFriday), name: 'Sexta-feira Santa', type: 'National' as const },
    { date: formatDateKey(easter), name: 'Domingo de Páscoa', type: 'National' as const },
    { date: `${year}-04-25`, name: 'Dia da Liberdade', type: 'National' as const },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador', type: 'National' as const },
    { date: formatDateKey(corpusChristi), name: 'Corpo de Deus', type: 'National' as const },
    { date: `${year}-06-10`, name: 'Dia de Portugal', type: 'National' as const },
    { date: `${year}-08-15`, name: 'Assunção de Nossa Senhora', type: 'National' as const },
    { date: `${year}-10-05`, name: 'Implantação da República', type: 'National' as const },
    { date: `${year}-11-01`, name: 'Dia de Todos os Santos', type: 'National' as const },
    { date: `${year}-12-01`, name: 'Restauração da Independência', type: 'National' as const },
    { date: `${year}-12-08`, name: 'Imaculada Conceição', type: 'National' as const },
    { date: `${year}-12-25`, name: 'Natal', type: 'National' as const }
  ];

  return holidays;
}

/**
 * Checks if a specific date is a Holiday.
 * Merges standard Portuguese holidays with custom database holidays (national and location-specific).
 */
export function checkIsHoliday(
  date: Date,
  customHolidays?: Holiday[],
  userLocationId?: number
): { isHoliday: boolean; name?: string; type?: string } {
  const dateKey = formatDateKey(date);
  const year = date.getFullYear();

  // 1. Check custom holidays from database first (allows overrides or municipal holidays)
  if (customHolidays && customHolidays.length > 0) {
    const match = customHolidays.find(h => {
      if (h.date !== dateKey) return false;
      // If holiday has location restriction, check match
      if (h.locationId && userLocationId && h.locationId !== userLocationId) {
        return false;
      }
      return true;
    });

    if (match) {
      return { isHoliday: true, name: match.name, type: match.type || 'Feriado' };
    }
  }

  // 2. Fallback to standard Portuguese national holidays
  const nationalHolidays = getPortugueseNationalHolidays(year);
  const nationalMatch = nationalHolidays.find(h => h.date === dateKey);

  if (nationalMatch) {
    return { isHoliday: true, name: nationalMatch.name, type: 'National' };
  }

  return { isHoliday: false };
}

/**
 * Checks if a specific date is a Day Off (Folga) for a user based on their schedule.
 */
export function checkIsDayOff(
  date: Date,
  user: User,
  scheduleTemplate?: ScheduleTemplate
): boolean {
  if (scheduleTemplate) {
    const daySchedule = getEffectiveScheduleDay(date, user, scheduleTemplate);
    if (daySchedule && typeof daySchedule.isOff === 'boolean') {
      return daySchedule.isOff;
    }
  }

  // Default fallback: Saturday (6) and Sunday (0) are off-days
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

export interface DayBreakdownItem {
  date: string;
  dateObj: Date;
  dayOfWeekName: string;
  isOff: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isVacationDay: boolean; // Counts towards vacation deduction only if not off and not holiday
}

export interface VacationCalculationResult {
  calendarDays: number;
  vacationDays: number; // The actual working days deducted from vacation balance
  offDays: number; // Folgas / Fins de semana
  holidaysCount: number; // Feriados that fell on a work day
  holidaysList: { date: string; name: string }[];
  breakdown: DayBreakdownItem[];
}

const PT_DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Accurately calculates vacation days between startDate and endDate.
 * Subtracts both Days Off (Folgas / Fins de semana) and Holidays (Feriados) so only real working days count!
 */
export function calculateVacationDaysDetails(
  startDateStr: string,
  endDateStr: string,
  user: User,
  scheduleTemplate?: ScheduleTemplate,
  customHolidays?: Holiday[]
): VacationCalculationResult {
  if (!startDateStr || !endDateStr) {
    return {
      calendarDays: 0,
      vacationDays: 0,
      offDays: 0,
      holidaysCount: 0,
      holidaysList: [],
      breakdown: []
    };
  }

  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  if (end < start) {
    return {
      calendarDays: 0,
      vacationDays: 0,
      offDays: 0,
      holidaysCount: 0,
      holidaysList: [],
      breakdown: []
    };
  }

  let calendarDays = 0;
  let vacationDays = 0;
  let offDays = 0;
  let holidaysCount = 0;
  const holidaysList: { date: string; name: string }[] = [];
  const breakdown: DayBreakdownItem[] = [];

  const iter = new Date(start);

  while (iter <= end) {
    calendarDays++;
    const dateKey = formatDateKey(iter);
    const dayOfWeekName = PT_DAYS_OF_WEEK[iter.getDay()];

    const isOff = checkIsDayOff(iter, user, scheduleTemplate);
    const holidayInfo = checkIsHoliday(iter, customHolidays, user.locationId);

    if (isOff) {
      offDays++;
      // If it's a day off and also a holiday, it's primarily an off day;
      // we don't double count it in holidaysCount to avoid confusing subtraction maths
      breakdown.push({
        date: dateKey,
        dateObj: new Date(iter),
        dayOfWeekName,
        isOff: true,
        isHoliday: holidayInfo.isHoliday,
        holidayName: holidayInfo.name,
        isVacationDay: false
      });
    } else if (holidayInfo.isHoliday) {
      holidaysCount++;
      holidaysList.push({
        date: dateKey,
        name: holidayInfo.name || 'Feriado'
      });
      breakdown.push({
        date: dateKey,
        dateObj: new Date(iter),
        dayOfWeekName,
        isOff: false,
        isHoliday: true,
        holidayName: holidayInfo.name,
        isVacationDay: false
      });
    } else {
      // Regular work day -> counts as a vacation day
      vacationDays++;
      breakdown.push({
        date: dateKey,
        dateObj: new Date(iter),
        dayOfWeekName,
        isOff: false,
        isHoliday: false,
        isVacationDay: true
      });
    }

    iter.setDate(iter.getDate() + 1);
  }

  return {
    calendarDays,
    vacationDays,
    offDays,
    holidaysCount,
    holidaysList,
    breakdown
  };
}
