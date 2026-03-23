/**
 * Kiosk Clock Service - OPTIONAL GEOLOCATION
 * Tenta obter localização mas permite picagem mesmo se falhar
 * Cria anomalia quando geolocalização falha
 */

import { User } from '../types';
import { resilientTimeLogService } from './resilientTimeLogService';
import { geolocationService, GeolocationResult } from './geolocationService';

export interface KioskClockResult {
  success: boolean;
  message: string;
  isOffline?: boolean;
  error?: string;
  log?: any;
  geolocation?: {
    lat: number;
    lng: number;
    locationName: string;
  };
  warning?: string; // Aviso quando GPS falha mas picagem é permitida
}

class KioskClockService {
  /**
   * Regista entrada - Geolocalização OPCIONAL (cria anomalia se falhar)
   */
  async clockIn(user: User): Promise<KioskClockResult> {
    try {
      console.log(`[KioskClock] ClockIn initiated for user ${user.id} - ${user.name}`);

      let lat: number | undefined;
      let lng: number | undefined;
      let locationName: string = 'Localização não disponível';
      let geoWarning: string | undefined;

      // STEP 1: Try to get geolocation (OPTIONAL - não bloqueia picagem)
      console.log('[KioskClock] Requesting geolocation (OPTIONAL)...');
      const geoResult: GeolocationResult = await geolocationService.getCurrentLocation(15000); // 15s timeout

      if (!geoResult.success) {
        console.warn('[KioskClock] ⚠️ Geolocation FAILED (will create anomaly):', geoResult.error);
        geoWarning = `Picagem registada sem GPS: ${geoResult.error}`;
        // NÃO BLOQUEIA - continua sem GPS
      } else {
        lat = geoResult.coords!.lat;
        lng = geoResult.coords!.lng;
        console.log(`[KioskClock] ✅ Geolocation obtained: ${lat}, ${lng}`);

        // STEP 2: Validate geo restrictions ONLY if we have coordinates
        // SKIP geofence validation if flexible schedule is enabled
        const attendanceConfig = user.attendanceConfig;
        if (attendanceConfig?.restrictGeo && !attendanceConfig?.flexibleSchedule) {
          console.log('[KioskClock] Validating geo restrictions...');

          const validation = geolocationService.isWithinAllowedLocations(
            lat,
            lng,
            attendanceConfig.allowedLocations || []
          );

          if (!validation.allowed) {
            const nearestMsg = validation.nearestLocation
              ? `Localização mais próxima: ${validation.nearestLocation.name} (${geolocationService.formatDistance(validation.distance!)} de distância)`
              : 'Nenhuma localização permitida configurada';

            console.error('[KioskClock] ❌ GEO RESTRICTION FAILED:', nearestMsg);

            return {
              success: false,
              message: `Não está numa localização permitida. ${nearestMsg}`,
              error: 'GEO_RESTRICTION_FAILED'
            };
          }

          console.log('[KioskClock] ✅ Geo restrictions validated');
        } else if (attendanceConfig?.flexibleSchedule) {
          console.log('[KioskClock] ℹ️ Flexible schedule - skipping geo restrictions');
        }

        // STEP 3: Get location name
        locationName = await geolocationService.getLocationName(lat, lng);
      }

      // STEP 4: Perform clock in (with or without geolocation data)
      const enhancedUser = {
        ...user,
        __tempLocation: locationName,
        __tempCoords: lat && lng ? { lat, lng } : undefined,
        __tempIp: null, // Will be set by ResilientKioskWrapper if needed
        __tempGeoWarning: geoWarning // Flag para criar anomalia
      };

      const result = await resilientTimeLogService.clockIn(enhancedUser);

      if (result.success) {
        console.log(`✅ [KioskClock] ClockIn success ${lat && lng ? 'with' : 'WITHOUT'} geolocation`);
        return {
          success: true,
          message: result.message,
          isOffline: false,
          log: result.log,
          warning: geoWarning,
          geolocation: lat && lng ? {
            lat,
            lng,
            locationName
          } : undefined
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
   * Regista saída - Geolocalização OPCIONAL (cria anomalia se falhar)
   */
  async clockOut(user: User): Promise<KioskClockResult> {
    try {
      console.log(`[KioskClock] ClockOut initiated for user ${user.id} - ${user.name}`);

      let lat: number | undefined;
      let lng: number | undefined;
      let locationName: string = 'Localização não disponível';
      let geoWarning: string | undefined;

      // STEP 1: Try to get geolocation (OPTIONAL - não bloqueia picagem)
      console.log('[KioskClock] Requesting geolocation (OPTIONAL)...');
      const geoResult: GeolocationResult = await geolocationService.getCurrentLocation(15000);

      if (!geoResult.success) {
        console.warn('[KioskClock] ⚠️ Geolocation FAILED (will create anomaly):', geoResult.error);
        geoWarning = `Picagem registada sem GPS: ${geoResult.error}`;
        // NÃO BLOQUEIA - continua sem GPS
      } else {
        lat = geoResult.coords!.lat;
        lng = geoResult.coords!.lng;
        console.log(`[KioskClock] ✅ Geolocation obtained: ${lat}, ${lng}`);

        // STEP 2: Validate geo restrictions ONLY if we have coordinates
        // SKIP geofence validation if flexible schedule is enabled
        const attendanceConfig = user.attendanceConfig;
        if (attendanceConfig?.restrictGeo && !attendanceConfig?.flexibleSchedule) {
          console.log('[KioskClock] Validating geo restrictions...');

          const validation = geolocationService.isWithinAllowedLocations(
            lat,
            lng,
            attendanceConfig.allowedLocations || []
          );

          if (!validation.allowed) {
            const nearestMsg = validation.nearestLocation
              ? `Localização mais próxima: ${validation.nearestLocation.name} (${geolocationService.formatDistance(validation.distance!)} de distância)`
              : 'Nenhuma localização permitida configurada';

            console.error('[KioskClock] ❌ GEO RESTRICTION FAILED:', nearestMsg);

            return {
              success: false,
              message: `Não está numa localização permitida. ${nearestMsg}`,
              error: 'GEO_RESTRICTION_FAILED'
            };
          }

          console.log('[KioskClock] ✅ Geo restrictions validated');
        } else if (attendanceConfig?.flexibleSchedule) {
          console.log('[KioskClock] ℹ️ Flexible schedule - skipping geo restrictions');
        }

        // STEP 3: Get location name
        locationName = await geolocationService.getLocationName(lat, lng);
      }

      // STEP 4: Perform clock out (with or without geolocation data)
      const enhancedUser = {
        ...user,
        __tempLocation: locationName,
        __tempCoords: lat && lng ? { lat, lng } : undefined,
        __tempIp: null,
        __tempGeoWarning: geoWarning // Flag para criar anomalia
      };

      const result = await resilientTimeLogService.clockOut(enhancedUser);

      if (result.success) {
        console.log(`✅ [KioskClock] ClockOut success ${lat && lng ? 'with' : 'WITHOUT'} geolocation`);
        return {
          success: true,
          message: result.message,
          isOffline: false,
          log: result.log,
          warning: geoWarning,
          geolocation: lat && lng ? {
            lat,
            lng,
            locationName
          } : undefined
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
   * Obtém o registo atual do utilizador
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
