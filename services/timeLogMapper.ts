/**
 * Time Log Mapper
 * Converte entre formato TypeScript (camelCase) e PostgreSQL (snake_case)
 */

import { TimeLog } from '../types';

/**
 * Mapeia dados do banco (snake_case) para TypeScript (camelCase)
 */
export function mapTimeLogFromDB(dbRow: any): TimeLog {
  if (!dbRow) return null as any;

  return {
    id: dbRow.id,
    userId: dbRow.user_id,
    date: dbRow.date,
    checkIn: dbRow.check_in,
    checkOut: dbRow.check_out,
    breakStart: dbRow.break_start,
    breakEnd: dbRow.break_end,
    totalHours: dbRow.total_hours,
    checkInLocation: dbRow.check_in_location,
    checkOutLocation: dbRow.check_out_location,
    checkInIp: dbRow.check_in_ip,
    checkOutIp: dbRow.check_out_ip,
    checkInCoordinates: dbRow.check_in_coordinates,
    checkOutCoordinates: dbRow.check_out_coordinates,
    status: dbRow.status,
    notes: dbRow.notes,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at
  };
}

/**
 * Mapeia dados TypeScript (camelCase) para formato do banco (snake_case)
 */
export function mapTimeLogToDB(log: Partial<TimeLog>): any {
  const mapped: any = {};

  if (log.id !== undefined) mapped.id = log.id;
  if (log.userId !== undefined) mapped.user_id = log.userId;
  if (log.date !== undefined) mapped.date = log.date;
  if (log.checkIn !== undefined) mapped.check_in = log.checkIn;
  if (log.checkOut !== undefined) mapped.check_out = log.checkOut;
  if (log.breakStart !== undefined) mapped.break_start = log.breakStart;
  if (log.breakEnd !== undefined) mapped.break_end = log.breakEnd;
  if (log.totalHours !== undefined) mapped.total_hours = log.totalHours;
  if (log.checkInLocation !== undefined) mapped.check_in_location = log.checkInLocation;
  if (log.checkOutLocation !== undefined) mapped.check_out_location = log.checkOutLocation;
  if (log.checkInIp !== undefined) mapped.check_in_ip = log.checkInIp;
  if (log.checkOutIp !== undefined) mapped.check_out_ip = log.checkOutIp;
  if (log.checkInCoordinates !== undefined) mapped.check_in_coordinates = log.checkInCoordinates;
  if (log.checkOutCoordinates !== undefined) mapped.check_out_coordinates = log.checkOutCoordinates;
  if (log.status !== undefined) mapped.status = log.status;
  if (log.notes !== undefined) mapped.notes = log.notes;
  if (log.createdAt !== undefined) mapped.created_at = log.createdAt;
  if (log.updatedAt !== undefined) mapped.updated_at = log.updatedAt;

  return mapped;
}

/**
 * Mapeia array de time logs do banco
 */
export function mapTimeLogsFromDB(dbRows: any[]): TimeLog[] {
  if (!dbRows || !Array.isArray(dbRows)) return [];
  return dbRows.map(mapTimeLogFromDB).filter(Boolean);
}