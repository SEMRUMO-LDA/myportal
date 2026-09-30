/**
 * Time Log Service
 * Sistema simplificado para registo de ponto
 * Realiza chamadas diretas à base de dados
 */

import { supabase } from './supabaseClient';
import { User, TimeLog, TimeLogStatus } from '../types';
import { ensureNumericId } from './idResolver';
import { anomalyService } from './anomalyService';

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

const OFFLINE_QUEUE_KEY = 'myportal_offline_queue_v1';

interface OfflineAction {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  payload: any;
  userId: number | string;
  targetLogId?: number;
  timestamp: number;
}

// Embellished User from the Kiosk Wrapper
interface KioskSubmissionUser extends User {
  __tempLocation?: string;
  __tempIp?: string | null;
  __tempCoords?: { lat: number; lng: number } | null;
  __tempGeoWarning?: string; // Warning message when GPS fails
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
      let data: any = null;
      let error: any = null;

      if (!navigator.onLine) {
        console.warn(`[ClockIn] Device offline. Queuing locally.`);
        this.queueOfflineAction({ id: crypto.randomUUID(), type: 'CLOCK_IN', payload: logData, userId, timestamp: Date.now() });
        return {
          success: true,
          message: `Modo Offline: Entrada registada às ${time} (Sincronizará quando houver internet)`,
          isOffline: true,
          log: this.mapTimeLog({ ...logData, id: -1, isOffline: true })
        };
      }

      const res = await supabase.from('time_logs').insert(logData).select().maybeSingle();
      data = res.data;
      error = res.error;

      if (error) {
        console.warn(`[ClockIn] Supabase DB Error, queuing offline:`, error);
        this.queueOfflineAction({ id: crypto.randomUUID(), type: 'CLOCK_IN', payload: logData, userId, timestamp: Date.now() });
        return {
          success: true,
          message: `Entrada registada localmente às ${time} (Falha de servidor, sincronizará em breve)`,
          isOffline: true,
          log: this.mapTimeLog({ ...logData, id: -1, isOffline: true })
        };
      }

      console.log(`✅ [ClockIn] Success for user ${userId}`);

      // CRIAR ANOMALIA se GPS falhou
      if (user.__tempGeoWarning && data?.id) {
        console.warn(`⚠️ [ClockIn] Creating anomaly for missing GPS: ${user.__tempGeoWarning}`);
        await anomalyService.createAnomaly({
          userId: userId,
          userEmail: userArg.email,
          date: date,
          type: 'MISSING_GPS',
          description: user.__tempGeoWarning,
          timeLogId: data.id,
          detectedBy: 'SISTEMA_GPS',
          severity: 'LOW',
          status: 'PENDING'
        }).catch(err => {
          console.error('[ClockIn] Failed to create GPS anomaly:', err);
          // Não falha a picagem se anomalia falhar
        });
      }

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

      if (!targetLogId && navigator.onLine) {
        return { success: false, message: 'Erro: Não foi encontrada entrada ativa para finalizar' };
      }

      const updateData: any = {
        check_out: time,
        check_out_location: user.__tempLocation || 'Sistema',
        check_out_ip: user.__tempIp || null,
        check_out_coordinates: user.__tempCoords || null,
        status: 'COMPLETED' as TimeLogStatus
      };

      // Automatic Lunch Break registration based on user schedule
      if (user.lunchStartTime && user.lunchEndTime) {
        console.log(`[ClockOut] Auto-registering lunch break: ${user.lunchStartTime} - ${user.lunchEndTime}`);
        updateData.break_start = user.lunchStartTime;
        updateData.break_end = user.lunchEndTime;
      }

      if (typeof userId === 'string' && !/^\d+$/.test(userId)) {
        throw new Error(`CRITICAL_JS_ERROR: userId is UUID "${userId}" in clockOut.`);
      }

      console.log(`[ClockOut] Updating log ${targetLogId || 'OFFLINE'} with checkout time ${time}`);
      
      let updateResult: any = null;
      let updateError: any = null;

      if (!navigator.onLine) {
        console.warn(`[ClockOut] Device offline. Queuing locally.`);
        this.queueOfflineAction({ id: crypto.randomUUID(), type: 'CLOCK_OUT', payload: updateData, userId, targetLogId, timestamp: Date.now() });
        return {
          success: true,
          message: `Modo Offline: Saída registada às ${time} (Sincronizará quando houver internet)`,
          isOffline: true,
          log: this.mapTimeLog({ ...updateData, id: targetLogId || -1, isOffline: true })
        };
      }

      const res = await supabase
        .from('time_logs')
        .update(updateData)
        .eq('id', targetLogId)
        .select()
        .maybeSingle();

      updateResult = res.data;
      updateError = res.error;

      if (updateError) {
        console.warn(`[ClockOut] Supabase Update Error, queuing offline:`, updateError);
        this.queueOfflineAction({ id: crypto.randomUUID(), type: 'CLOCK_OUT', payload: updateData, userId, targetLogId, timestamp: Date.now() });
        return {
          success: true,
          message: `Saída registada localmente às ${time} (Falha de servidor, sincronizará em breve)`,
          isOffline: true,
          log: this.mapTimeLog({ ...updateData, id: targetLogId || -1, isOffline: true })
        };
      }

      console.log(`✅ [ClockOut] Success for log ${targetLogId}`);

      // CRIAR ANOMALIA se GPS falhou
      if (user.__tempGeoWarning && targetLogId) {
        const date = now.toISOString().split('T')[0];
        console.warn(`⚠️ [ClockOut] Creating anomaly for missing GPS: ${user.__tempGeoWarning}`);
        await anomalyService.createAnomaly({
          userId: userId,
          userEmail: userArg.email,
          date: date,
          type: 'MISSING_GPS',
          description: user.__tempGeoWarning,
          timeLogId: targetLogId,
          detectedBy: 'SISTEMA_GPS',
          severity: 'LOW',
          status: 'PENDING'
        }).catch(err => {
          console.error('[ClockOut] Failed to create GPS anomaly:', err);
          // Não falha a picagem se anomalia falhar
        });
      }

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

  private getOfflineQueue(): OfflineAction[] {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private setOfflineQueue(queue: OfflineAction[]) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('[ResilientTimeLogService] Error saving offline queue:', err);
    }
  }

  private queueOfflineAction(action: OfflineAction) {
    const queue = this.getOfflineQueue();
    queue.push(action);
    this.setOfflineQueue(queue);
    
    // Trigger background sync attempt when back online
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((swRegistration: any) => {
        try {
          swRegistration.sync.register('sync-time-logs');
        } catch (e) {
           // fallback to direct sync
        }
      });
    }
    
    // Attempt immediate background sync just in case
    setTimeout(() => this.syncOfflineQueue(), 5000);
  }

  async syncOfflineQueue(): Promise<boolean> {
    if (!navigator.onLine) return false;
    
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return true;

    console.log(`[ResilientTimeLogService] Starting sync of ${queue.length} offline actions...`);
    
    const remainingQueue: OfflineAction[] = [];
    let syncedCount = 0;

    for (const action of queue) {
      try {
        if (action.type === 'CLOCK_IN') {
          const { error } = await supabase.from('time_logs').insert(action.payload);
          if (error) throw error;
        } else if (action.type === 'CLOCK_OUT') {
          let targetLogId = action.targetLogId;
          
          if (!targetLogId) {
             // Find last active log for user
             const { data } = await supabase
              .from('time_logs')
              .select('id')
              .eq('user_id', action.userId)
              .is('check_out', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
              
             if (data) targetLogId = data.id;
          }
          
          if (targetLogId) {
            const { error } = await supabase.from('time_logs').update(action.payload).eq('id', targetLogId);
            if (error) throw error;
          } else {
            console.warn(`[SyncOffline] Could not find target log for clock out of user ${action.userId}`);
          }
        }
        syncedCount++;
      } catch (err) {
        console.error(`[SyncOffline] Failed to sync action ${action.id}:`, err);
        remainingQueue.push(action);
      }
    }

    this.setOfflineQueue(remainingQueue);
    console.log(`[ResilientTimeLogService] Synced ${syncedCount} actions. ${remainingQueue.length} remaining.`);
    
    return remainingQueue.length === 0;
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
