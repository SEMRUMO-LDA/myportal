/**
 * Kiosk Clock Service - Wrapper Resiliente para Picar Ponto no Kiosk
 * Garante funcionamento 100% confiável mesmo em cenários de falha
 */

import { User } from '../types';
import { resilientTimeLogService } from './resilientTimeLogService';

export interface KioskClockResult {
  success: boolean;
  message: string;
  isOffline?: boolean;
  error?: string;
  log?: any;
}

class KioskClockService {
  /**
   * Regista entrada de forma resiliente
   */
  async clockIn(user: User): Promise<KioskClockResult> {
    try {
      console.log(`[KioskClock] ClockIn initiated for user ${user.id} - ${user.name}`);

      const result = await resilientTimeLogService.clockIn(user);

      if (result.success) {
        console.log(`✅ [KioskClock] ClockIn success - ${result.isOffline ? 'OFFLINE' : 'ONLINE'}`);
        return {
          success: true,
          message: result.message,
          isOffline: false,
          log: result.log
        };
      } else {
        console.error(`❌ [KioskClock] ClockIn failed:`, result.message);
        return {
          success: false,
          message: result.message,
          error: result.message
        };
      }
    } catch (error: any) {
      console.error(`❌ [KioskClock] ClockIn critical error:`, error);
      return {
        success: false,
        message: 'Erro crítico ao registar entrada. Por favor tente novamente.',
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * Regista saída de forma resiliente
   */
  async clockOut(user: User): Promise<KioskClockResult> {
    try {
      console.log(`[KioskClock] ClockOut initiated for user ${user.id} - ${user.name}`);

      const result = await resilientTimeLogService.clockOut(user);

      if (result.success) {
        console.log(`✅ [KioskClock] ClockOut success - ${result.isOffline ? 'OFFLINE' : 'ONLINE'}`);
        return {
          success: true,
          message: result.message,
          isOffline: false,
          log: result.log
        };
      } else {
        console.error(`❌ [KioskClock] ClockOut failed:`, result.message);
        return {
          success: false,
          message: result.message,
          error: result.message
        };
      }
    } catch (error: any) {
      console.error(`❌ [KioskClock] ClockOut critical error:`, error);
      return {
        success: false,
        message: 'Erro crítico ao registar saída. Por favor tente novamente.',
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * Verifica se utilizador está com entrada registada
   */
  async isUserClockedIn(user: User): Promise<boolean> {
    try {
      return await resilientTimeLogService.isUserClockedIn(user);
    } catch (error) {
      console.error('[KioskClock] Error checking clock status:', error);
      return false;
    }
  }

  /**
   * Obt\u00e9m o registo atual do utilizador
   */
  async getCurrentLog(user: User) {
    try {
      return await resilientTimeLogService.getCurrentLog(user);
    } catch (error) {
      console.error('[KioskClock] Error getting current log:', error);
      return null;
    }
  }

  /**
   * Verifica estado da conectividade
   */
  getConnectionStatus(): boolean {
    return navigator.onLine;
  }
}

export const kioskClockService = new KioskClockService();
