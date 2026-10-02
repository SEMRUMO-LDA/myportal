import React, { useState } from 'react';
import { User, TimeLog, TimeLogStatus } from '../types';
import { kioskClockService } from '../services/kioskClockService';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { getEffectiveScheduleDay } from '../utils/scheduleUtils';
import { resolveNumericUserId } from '../services/idResolver';

// Helper for distances
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getMinutesFromTime(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

interface ResilientKioskWrapperProps {
  currentUser: User | null;
  timeLogs: any[];
  addToast?: any;
  setTimeLogs?: any;
  setAnomalies?: any;
  users?: any;
  locations?: any;
  lockedMonths?: any;
  scheduleTemplates?: any;
  emitNotification?: any;
  emitNotificationBulk?: any;
  children: (handlers: {
    handleClockIn: (user: User) => Promise<boolean>;
    handleClockOut: (user: User) => Promise<boolean>;
  }) => React.ReactNode;
}

export const ResilientKioskWrapper: React.FC<ResilientKioskWrapperProps> = ({ 
  currentUser, timeLogs, setTimeLogs, setAnomalies, users, locations, lockedMonths, scheduleTemplates, emitNotification, children 
}) => {
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // --- CLOCK IN LOGIC EXTRACTED FROM APP.TSX ---
  const handleClockIn = async (userEntry: User): Promise<boolean> => {
    if (isProcessing) return false;
    setIsProcessing(true);

    try {
      console.log(`[Kiosk] ClockIn request for ${userEntry.name}`);

      // 0. SECURITY: Resolve Numeric ID
      let user = { ...userEntry };
      const numericId = await resolveNumericUserId(userEntry.id, userEntry.email);
      
      if (numericId) {
        user.id = numericId;
        // Fetch fresh config
        const { data: freshUser } = await supabase.from('users').select('attendance_config').eq('id', numericId).maybeSingle();
        if (freshUser) {
          user.attendanceConfig = freshUser.attendance_config;
        }
      } else {
        addToast('error', 'Erro critico: Não foi possível validar o seu identificador de utilizador.');
        return false;
      }


      // HELPER: Expected Schedule
      let expectedStart = user.workStartTime;
      if (user.scheduleTemplateId && scheduleTemplates) {
        const tmpl = scheduleTemplates.find((t: any) => t.id === user.scheduleTemplateId);
        if (tmpl) {
          const daySched = getEffectiveScheduleDay(new Date(), user, tmpl);
          if (daySched && !daySched.isOff) expectedStart = daySched.start;
        }
      }

      if (user.attendanceConfig?.blockEntry) {
        addToast('error', 'A sua picagem encontra-se bloqueada. Contacte a administração.');
        return false;
      }

      const now = new Date();
      if (lockedMonths?.some((lock: any) => lock.year === now.getFullYear() && lock.month === now.getMonth() + 1 && lock.isLocked)) {
        addToast('error', 'O mês atual está fechado. Contacte o administrador.');
        return false;
      }

      // Check Stale/Forgotten Exits
      const existingLog = timeLogs?.find((l: any) => String(l.userId) === String(user.id) && !l.checkOut);
      if (existingLog) {
        const [checkInH, checkInM] = (existingLog.checkIn || '00:00').split(':').map(Number);
        const shiftStart = new Date(existingLog.date + 'T00:00:00');
        shiftStart.setHours(checkInH, checkInM, 0, 0);
        const hoursElapsed = (now.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed < 16) {
          addToast('warning', `Já tem um turno em curso desde as ${existingLog.checkIn}. Registe a saída primeiro.`);
          return false;
        }

        try {
          const autoCheckOut = '23:59';
          await supabase.from('time_logs').update({ check_out: autoCheckOut, check_out_location: 'Saída automática', status: 'INCOMPLETE' }).eq('id', existingLog.id);
          
          if (setTimeLogs) {
             setTimeLogs((prev: any) => prev.map((l: any) => l.id === existingLog.id ? { ...l, checkOut: autoCheckOut, status: TimeLogStatus.INCOMPLETE } : l));
          }

          const anomalyPayload = {
            user_id: numericId, // USE RESOLVED NUMERIC ID
            date: existingLog.date, 
            type: 'SAIDA_NAO_REGISTADA', 
            description: `Fecho automático aplicado.`, 
            status: 'pending', 
            created_at: new Date().toISOString()
          };
          const { data: newAnomaly } = await supabase.from('anomalies').insert(anomalyPayload).select().maybeSingle();
          if (newAnomaly && setAnomalies) {
            setAnomalies((prev: any) => [{ ...newAnomaly, userId: newAnomaly.user_id, createdAt: newAnomaly.created_at }, ...prev]);
          }
          addToast('warning', `Turno de ontem fechado automaticamente.`);
        } catch (err) {
          addToast('error', `Falha ao fechar turno pendente. Contacte admin.`);
          return false;
        }
      }

      // 1. Fetch IP Address
      let entryIp = 'Unknown';
      let ipError = false;
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        entryIp = (await ipRes.json()).ip;
      } catch (e) {
        try {
          const fallbackRes = await fetch('https://ipapi.co/json/');
          entryIp = (await fallbackRes.json()).ip;
        } catch (e2) {
          entryIp = 'Error/Offline';
          ipError = true;
        }
      }

      // 2. Fetch Geolocation
      let coords: { lat: number; lng: number } | null = null;
      let locationName = '';
      let isFallbackAuthorized = false;

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
        });
        coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        locationName = `GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      } catch (error) {
        const allAllowedIps = new Set<string>();
        const userLoc = locations?.find((l: any) => l.id === user.locationId);
        if (userLoc?.allowedIps) userLoc.allowedIps.split(',').forEach((ip: string) => allAllowedIps.add(ip.trim()));
        user.locationIds?.forEach(lid => {
          const loc = locations?.find((l: any) => l.id === lid);
          if (loc?.allowedIps) loc.allowedIps.split(',').forEach((ip: string) => allAllowedIps.add(ip.trim()));
        });

        const strictGeo = user.attendanceConfig?.restrictGeo ?? false;
        if (!ipError && allAllowedIps.size > 0 && allAllowedIps.has(entryIp)) {
          locationName = 'Validação por IP';
          isFallbackAuthorized = true;
        } else if (!strictGeo) {
          locationName = 'Localização indisponível (Autorizado)';
          isFallbackAuthorized = true;
        } else {
          addToast('error', 'Falta partilhar geo-localização para validar a picagem (Restrição Ativa).');
          return false;
        }
      }

      // 3. Validation Logic
      const hasLocationConfig = (user.locationIds && user.locationIds.length > 0) || user.locationId;
      if (hasLocationConfig || user.attendanceConfig) {
        const assignedIds = new Set<number>();
        if (user.locationId) assignedIds.add(user.locationId);
        if (user.locationIds) user.locationIds.forEach(id => assignedIds.add(id));
        const userLocations = locations?.filter((l: any) => assignedIds.has(l.id)) || [];

        const strictGeo = user.attendanceConfig?.restrictGeo ?? false;
        const strictIp = user.attendanceConfig?.restrictIp ?? false;

        if (!(!strictGeo && !strictIp && user.attendanceConfig?.restriction === 'NONE')) {
          let isGeoValid = false;
          let isIpValid = false;

          // Geo
          if (coords) {
            for (const loc of userLocations) {
               if (loc.coordinates) {
                 const dist = getDistanceFromLatLonInMeters(coords.lat, coords.lng, loc.coordinates.lat, loc.coordinates.lng);
                 if (dist <= (loc.coordinates.radius || 750)) { isGeoValid = true; break; }
               }
            }
          }
          // IP
          const validIps = new Set<string>();
          if (user.attendanceConfig?.allowedIps) user.attendanceConfig.allowedIps.forEach(ip => validIps.add(ip.trim()));
          userLocations.forEach((loc: any) => { if (loc.allowedIps) loc.allowedIps.split(',').forEach((ip: string) => validIps.add(ip.trim())); });
          if (!ipError && validIps.size > 0 && validIps.has(entryIp)) isIpValid = true;

          // Remote Home
          if (user.attendanceConfig?.isRemote && user.attendanceConfig?.homeCoordinates && coords) {
            const home = user.attendanceConfig.homeCoordinates;
             if (getDistanceFromLatLonInMeters(coords.lat, coords.lng, home.lat, home.lng) <= (home.radius || 750)) {
                isGeoValid = true; locationName += ' (Remoto/Casa)';
             }
          }

          const isLocationVerified = isGeoValid || isIpValid || isFallbackAuthorized;
          let denyReason = '';
          if (strictGeo && !isLocationVerified) denyReason += 'Geolocalização. ';
          if (strictIp && validIps.size > 0 && !isIpValid) denyReason += 'IP. ';

          if (denyReason) {
            addToast('error', `Acesso Negado: ${denyReason}`);
            return false;
          }
        }
      }

      // CLOCK SERVICE CALL
      const submissionUser = { ...user, __tempLocation: locationName, __tempIp: entryIp === 'Error/Offline' ? null : entryIp, __tempCoords: coords };
      const result = await kioskClockService.clockIn(submissionUser);

      if (result.success && result.log) {
        addToast('success', `✅ ${result.message}`);

        // Mostrar aviso se GPS falhou
        if (result.warning) {
          addToast('warning', `⚠️ ${result.warning}`);
        }

        if (setTimeLogs) {
          setTimeLogs((prev: any) => [result.log, ...prev]);
        }
        
        // CHECK DELAYS
        if (!user.attendanceConfig?.flexibleSchedule && expectedStart) {
          const checkInMins = getMinutesFromTime(user.workStartTime ? result.log.checkIn : result.log.checkIn);
          const startMins = getMinutesFromTime(expectedStart);
          const userLocation = locations?.find((l: any) => l.id === user.locationId);
          const toleranceEntry = userLocation?.toleranceEntry ?? 15;

          if (checkInMins > startMins + toleranceEntry) {
            const diff = checkInMins - startMins;
            const isCritical = diff >= 30;
            const anomalyStatus = isCritical ? 'AWAITING_JUSTIFICATION' : 'PENDING';
            const { data: anomalyData } = await supabase.from('anomalies').insert({
              user_id: numericId, // USE RESOLVED NUMERIC ID
              time_log_id: result.log.id, 
              type: 'LATE_ENTRY', 
              minutes: diff, 
              status: anomalyStatus, 
              created_at: new Date().toISOString()
            }).select().maybeSingle();
            if (anomalyData && setAnomalies) {
              setAnomalies((prev: any) => [{ ...anomalyData, userId: anomalyData.user_id, timeLogId: anomalyData.time_log_id, createdAt: anomalyData.created_at }, ...prev]);
            }
          }
        }

        return true;
      } else if (!result.success) {
        addToast('error', `❌ ${result.message}`);
        return false;
      }

      return false;

    } finally {
      setIsProcessing(false);
    }
  };


  // --- CLOCK OUT LOGIC EXTRACTED FROM APP.TSX ---
  const handleClockOut = async (userEntry: User): Promise<boolean> => {
    if (isProcessing) return false;
    setIsProcessing(true);

    try {
      console.log(`[Kiosk] ClockOut request for ${userEntry.name}`);
      let user = { ...userEntry };
      
      // Resolve Numeric ID
      const numericId = await resolveNumericUserId(userEntry.id, userEntry.email);
      
      if (numericId) {
        user.id = numericId;
      } else {
        addToast('error', 'Erro critico: Não foi possível validar o seu identificador de utilizador.');
        return false;
      }

       const now = new Date();
       const currentLog = timeLogs?.find((l: any) => String(l.userId) === String(user.id) && !l.checkOut);
       
       if (!currentLog) {
         console.warn(`[Kiosk ClockOut] Turno aberto não encontrado em cache para ID ${user.id}.`);
       }

       let exitIp = 'Unknown';
       let ipError = false;
       try {
         const ipRes = await fetch('https://api.ipify.org?format=json');
         exitIp = (await ipRes.json()).ip;
       } catch (e) {
         try {
           const fallbackRes = await fetch('https://ipapi.co/json/');
           exitIp = (await fallbackRes.json()).ip;
         } catch (e2) {
           exitIp = 'Error/Offline';
           ipError = true;
         }
       }

       let coords: { lat: number; lng: number } | null = null;
       let exitLocation = '';
       let isFallbackAuthorized = false;

       try {
         const position = await new Promise<GeolocationPosition>((resolve, reject) => {
           navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
         });
         coords = { lat: position.coords.latitude, lng: position.coords.longitude };
         exitLocation = `GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
       } catch (error) {
         const strictGeo = user.attendanceConfig?.restrictGeo ?? false;
         const allAllowedIps = new Set<string>();
         
         if (user.locationId) {
            const loc = locations?.find((l: any) => l.id === user.locationId);
            if (loc?.allowedIps) loc.allowedIps.split(',').forEach((ip: string) => allAllowedIps.add(ip.trim()));
         }
         user.locationIds?.forEach(lid => {
            const loc = locations?.find((l: any) => l.id === lid);
            if (loc?.allowedIps) loc.allowedIps.split(',').forEach((ip: string) => allAllowedIps.add(ip.trim()));
         });

         if (!ipError && allAllowedIps.size > 0 && allAllowedIps.has(exitIp)) {
           exitLocation = 'Validação por IP';
           isFallbackAuthorized = true;
         } else if (!strictGeo) {
           exitLocation = 'Localização indisponível (Autorizado)';
           isFallbackAuthorized = true;
         } else {
           addToast('error', `Falha Geo (Saída): Restrição Ativa. GPS: falhou`);
           return false;
         }
       }

       const hasLocationCheck = (user.locationIds && user.locationIds.length > 0) || user.locationId;
       if (hasLocationCheck) {
         const assignedIds = new Set<number>();
         if (user.locationId) assignedIds.add(user.locationId);
         if (user.locationIds) user.locationIds.forEach(id => assignedIds.add(id));
         const userLocations = locations?.filter((l: any) => assignedIds.has(l.id)) || [];

         if (user.attendanceConfig?.restriction !== 'NONE') {
            const strictGeo = user.attendanceConfig?.restrictGeo ?? false;
            const strictIp = user.attendanceConfig?.restrictIp ?? false;
            let isGeoValid = false;
            let isIpValid = false;

            if (coords) {
              for (const loc of userLocations) {
                if (loc.coordinates) {
                  const dist = getDistanceFromLatLonInMeters(coords.lat, coords.lng, loc.coordinates.lat, loc.coordinates.lng);
                  if (dist <= (loc.coordinates.radius || 750)) { isGeoValid = true; break; }
                }
              }
            }

            const validIps = new Set<string>();
            userLocations.forEach((loc: any) => { if (loc.allowedIps) loc.allowedIps.split(',').forEach((ip: string) => validIps.add(ip.trim())); });
            if (!ipError && validIps.size > 0 && validIps.has(exitIp)) isIpValid = true;

            const isRemote = user.attendanceConfig?.isRemote;
            if (isRemote && user.attendanceConfig?.homeCoordinates && coords) {
              const home = user.attendanceConfig.homeCoordinates;
              if (getDistanceFromLatLonInMeters(coords.lat, coords.lng, home.lat, home.lng) <= (home.radius || 750)) {
                isGeoValid = true; exitLocation += ' (Remoto/Casa)';
              }
            }

            const isLocationVerified = isGeoValid || isIpValid || isFallbackAuthorized;
            let denyReason = '';
            if (strictGeo && !isLocationVerified) denyReason += 'Geolocalização. ';
            if (strictIp && validIps.size > 0 && !isIpValid) denyReason += 'IP. ';

            if (denyReason) {
              addToast('error', `Acesso Negado à Saída: ${denyReason}`);
              return false;
            }
         }
       }

       // CLOCK SERVICE CALL
       const submissionUser = { ...user, __tempLocation: exitLocation, __tempIp: exitIp === 'Error/Offline' ? null : exitIp, __tempCoords: coords };
       const result = await kioskClockService.clockOut(submissionUser);

       if (result.success && result.log) {
         addToast('success', `✅ ${result.message}`);

         // Mostrar aviso se GPS falhou
         if (result.warning) {
           addToast('warning', `⚠️ ${result.warning}`);
         }

         if (setTimeLogs) {
           setTimeLogs((prev: any) => prev.map((l: any) => l.id === result.log?.id ? { ...l, ...result.log } : l));
         }

         return true;
       } else if (!result.success) {
         addToast('error', `❌ ${result.message}`);
         return false;
       }

       return false;

     } finally {
       setIsProcessing(false);
     }
  };

  return <>{children({ handleClockIn, handleClockOut })}</>;
};
