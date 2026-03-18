/**
 * Time Log Service
 * Sistema simplificado para registo de ponto
 * Realiza chamadas diretas à base de dados
 */

import { supabase } from './supabaseClient';
import { User, TimeLog, TimeLogStatus } from '../types';
import { ensureNumericId } from './idResolver';

interface ClockInResult {
  success: boolean;
  message: string;
  log?: TimeLog;
  isOffline?: boolean;
}

interface ClockOutResult {
  success: boolean;
  message: string;
  log?: TimeLog;
  isOffline?: boolean;
}

// Embellished User from the Kiosk Wrapper
interface KioskSubmissionUser extends User {
  __tempLocation?: string;
  __tempIp?: string | null;
  __tempCoords?: { lat: number; lng: number } | null;
}

class ResilientTimeLogService {
  async clockIn(userArg: User): Promise<ClockInResult> {
    try {
      const userId = await ensureNumericId(userArg.id, userArg.email);
      
      // DEFENSIVE CHECK: Ensure we have a valid BigInt string/number
      if (!userId || isNaN(Number(userId))) {
        throw new Error(`Identificador de utilizador inválido (${userArg.id}). A base de dados requer um ID numérico.`);
      }

      console.log(`[ClockIn] Resolved User ID: ${userId} (Type: ${typeof userId}) for ${userArg.name}`);
      
      const user = userArg as KioskSubmissionUser;
      const now = new Date();
      const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });
      const date = now.toISOString().split('T')[0];

      const logData = {
        user_id: userId,
        date,
        check_in: time,
        check_in_location: user.__tempLocation || 'Sistema',
        check_in_ip: user.__tempIp || null,
        check_in_coordinates: user.__tempCoords || null,
        status: 'ACTIVE' as TimeLogStatus
      };

      // Removed verbose debug logs
      // Removed verbose debug logs
      const { data, error } = await supabase.from('time_logs').insert(logData).select().maybeSingle();

      if (error) {
        console.error(`[ClockIn] Supabase DB Error:`, error);
        throw error;
      }

      console.log(`✅ [ClockIn] Success for user ${userId}`);
      return {
        success: true,
        message: `Entrada registada às ${time}`,
        log: this.mapTimeLog(data)
      };
    } catch (error: any) {
      console.error(`❌ [ClockIn] error:`, error?.message || error);
      return {
        success: false,
        message: `Erro ao registar entrada: ${error?.message || 'Erro de conexão'}`
      };
    }
  }

  async clockOut(userArg: User, logId?: number): Promise<ClockOutResult> {
    try {
      const userId = await ensureNumericId(userArg.id, userArg.email);

      // DEFENSIVE CHECK: Ensure we have a valid BigInt string/number
      if (!userId || isNaN(Number(userId))) {
        throw new Error(`Identificador de utilizador inválido (${userArg.id}). A base de dados requer um ID numérico.`);
      }

      console.log(`[ClockOut] Resolved User ID: ${userId} (Type: ${typeof userId}) for ${userArg.name}`);
      
      const user = userArg as KioskSubmissionUser;
      const now = new Date();
      const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      let targetLogId = logId;

      if (!targetLogId) {
        console.log(`[ClockOut] No logId provided, searching for last active log for user ${userId}`);
        const { data, error } = await supabase
          .from('time_logs')
          .select('id')
          .eq('user_id', userId)
          .is('check_out', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error(`[ClockOut] Error searching for active log:`, error);
          throw error;
        }
        if (data) {
          targetLogId = data.id;
          console.log(`[ClockOut] Found active log ID: ${targetLogId}`);
        }
      }

      if (!targetLogId) {
        return { success: false, message: 'Erro: Não foi encontrada entrada ativa para finalizar' };
      }

      const updateData = {
        check_out: time,
        check_out_location: user.__tempLocation || 'Sistema',
        check_out_ip: user.__tempIp || null,
        check_out_coordinates: user.__tempCoords || null,
        status: 'COMPLETED' as TimeLogStatus
      };

      if (typeof userId === 'string' && !/^\d+$/.test(userId)) {
        throw new Error(`CRITICAL_JS_ERROR: userId is UUID "${userId}" in clockOut.`);
      }

      console.log(`[ClockOut] Updating log ${targetLogId} with checkout time ${time}`);
      const { data: updateResult, error: updateError } = await supabase
        .from('time_logs')
        .update(updateData)
        .eq('id', targetLogId)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error(`[ClockOut] Supabase Update Error:`, updateError);
        throw updateError;
      }

      console.log(`✅ [ClockOut] Success for log ${targetLogId}`);
      return {
        success: true,
        message: `Saída registada às ${time}`,
        log: this.mapTimeLog(updateResult)
      };
    } catch (error: any) {
      console.error(`❌ [ClockOut] error:`, error?.message || error);
      return {
        success: false,
        message: `Erro ao registar saída: ${error?.message || 'Erro de conexão'}`
      };
    }
  }

  async syncOfflineQueue(): Promise<boolean> {
    return true; // No-op
  }

  async getCurrentLog(userArg: User): Promise<TimeLog | null> {
    try {
      const userId = await ensureNumericId(userArg.id, userArg.email);
      const { data, error } = await supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', userId)
          .is('check_out', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) return this.mapTimeLog(data);
      return null;
    } catch (error) {
      console.error('❌ [GetCurrentLog] Error:', error);
      return null;
    }
  }

  async isUserClockedIn(user: User): Promise<boolean> {
    const currentLog = await this.getCurrentLog(user);
    return currentLog ? !currentLog.checkOut : false;
  }

  private mapTimeLog(data: any): TimeLog {
    if (!data) return {} as TimeLog;
    
    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      checkIn: data.check_in,
      checkOut: data.check_out,
      breakStart: data.break_start,
      breakEnd: data.break_end,
      totalHours: data.total_hours,
      checkInLocation: data.check_in_location,
      checkOutLocation: data.check_out_location,
      checkInIp: data.check_in_ip,
      checkOutIp: data.check_out_ip,
      checkInCoordinates: data.check_in_coordinates,
      checkOutCoordinates: data.check_out_coordinates,
      status: data.status as TimeLogStatus,
      createdAt: data.created_at,
      isOffline: data.isOffline || false
    };
  }
}

export const resilientTimeLogService = new ResilientTimeLogService();
