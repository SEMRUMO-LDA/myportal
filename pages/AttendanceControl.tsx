import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Header from '../components/Header';
import SearchableSelect from '../components/SearchableSelect';
import { User, TimeLog, TimeLogStatus, Company, Location, Department, HourBankAdjustment, Anomaly } from '../types';
import { UserRole } from '../types/auth';
import { supabase } from '../services/supabaseClient';
import { formatHoursHumanized } from '../utils/scheduleUtils';
import { validateBreaks, getBreakComplianceStatus } from '../utils/breakValidation';
import { isAnomalyCheckout } from '../utils/sessionChecker';
import { ANOMALY_CONFIG } from '../config/anomalyConfig';
import {
  Clock,
  MapPin,
  Map as MapIcon,
  List,
  X,
  Hourglass,
  CalendarDays,
  Plus,
  BellRing,
  Globe,
  AlertTriangle,
  ArrowRight,
  Search,
  CheckCircle2,
  Calendar,
  User as UserIcon,
  AlertCircle,
  Bell,
  RefreshCw,
  Edit3,
  MessageSquare,
  CheckSquare,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Coffee,
  Home,
  Building2,
  Trash2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { generateAttendanceReminder } from '../services/geminiService';
import { notificationService } from '../services/notificationService';
import { normalizeRoleName, isAdminRole, getRoleDisplayName } from '../utils/authUtils';

interface AttendanceControlProps {
  logs: TimeLog[];
  users: User[];
  locations: Location[];
  departments: Department[];
  anomalies: Anomaly[];
  currentUser: User | null;
  onAddLog: (log: TimeLog) => void;
  onDeleteLog?: (id: number) => void;
  hourBankAdjustments?: HourBankAdjustment[];
  onAddHourBankAdjustment?: (adj: Omit<HourBankAdjustment, 'id' | 'createdAt'>) => void;
  onUpdateAnomaly?: (anomaly: Anomaly, silent?: boolean) => void;
}

// Optimization: Move static helper outside component to avoid recreation
const timeToMinutes = (time: string | undefined) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Helper to recalculate total hours if missing
const calculateTotalHours = (log: TimeLog): number | undefined => {
  if (!log.checkIn || !log.checkOut) return undefined;

  try {
    // Parse check-in and check-out times
    const [h1, m1] = log.checkIn.split(':').map(Number);
    const [h2, m2] = log.checkOut.split(':').map(Number);

    // Convert to minutes for more precise calculation
    let checkInMinutes = h1 * 60 + m1;
    let checkOutMinutes = h2 * 60 + m2;

    // Handle overnight shifts
    if (checkOutMinutes < checkInMinutes) {
      checkOutMinutes += 24 * 60; // Add 24 hours in minutes
    }

    // Calculate total worked minutes
    let totalMinutes = checkOutMinutes - checkInMinutes;

    // Subtract break duration if available
    if (log.breakStart && log.breakEnd) {
      const [bh1, bm1] = log.breakStart.split(':').map(Number);
      const [bh2, bm2] = log.breakEnd.split(':').map(Number);

      let breakStartMinutes = bh1 * 60 + bm1;
      let breakEndMinutes = bh2 * 60 + bm2;

      // Handle break overnight (rare but possible)
      if (breakEndMinutes < breakStartMinutes) {
        breakEndMinutes += 24 * 60;
      }

      const breakMinutes = breakEndMinutes - breakStartMinutes;

      // Only subtract break if it's reasonable (less than total work time)
      if (breakMinutes > 0 && breakMinutes < totalMinutes) {
        totalMinutes -= breakMinutes;
      }
    }

    // Convert back to hours (with decimal precision)
    const totalHours = totalMinutes / 60;

    // Return 0 if negative (shouldn't happen with correct data)
    return totalHours > 0 ? totalHours : 0;
  } catch (e) {
    console.error('Error calculating total hours:', e, log);
    return undefined;
  }
};

const AttendanceControl: React.FC<AttendanceControlProps> = ({
  logs,
  users,
  locations,
  departments,
  anomalies,
  currentUser,
  onAddLog,
  onDeleteLog,
  hourBankAdjustments = [],
  onAddHourBankAdjustment,
  onUpdateAnomaly
}) => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<'daily' | 'bank' | 'reports'>('daily');
  const [adjustModalUserId, setAdjustModalUserId] = useState<number | null>(null);
  const [adjustMinutes, setAdjustMinutes] = useState<string>('30');
  const [adjustSign, setAdjustSign] = useState<'+' | '-'>('+');
  const [adjustType, setAdjustType] = useState<'manual' | 'correction' | 'reset'>('manual');
  const [adjustReason, setAdjustReason] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [filterDateMode, setFilterDateMode] = useState<'single' | 'range'>('single');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>(''); // 'LATE', 'INCOMPLETE', 'EARLY'
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isNotifying, setIsNotifying] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notifiedLogIds, setNotifiedLogIds] = useState<number[]>([]);
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  // ⚠️ NOVO: Estado para popup de gestão de anomalias
  const [anomalyPopupLog, setAnomalyPopupLog] = useState<TimeLog | null>(null);
  const [anomalyNote, setAnomalyNote] = useState('');
  const [isProcessingAnomaly, setIsProcessingAnomaly] = useState(false);

  // Sync tab with URL parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'bank') {
      setCurrentTab('bank');
    } else if (tabParam === 'reports') {
      setCurrentTab('reports');
    }
  }, [searchParams]);

  // REMOVED: Duplicate data loading - App.tsx already loads last 7 days efficiently
  // This was causing performance issues and duplicate data

  // Only RH and Admin can delete records
  const canDelete = onDeleteLog && (currentUser?.role === UserRole.ADMIN || isAdminRole(normalizeRoleName(currentUser?.role || '')));

  // Tolerance thresholds (in minutes)
  const TOLERANCE_MODERATE = 15; // 15-29min = warning (moderado)
  const TOLERANCE_CRITICAL = 30; // >= 30min = critical (crítico - requer justificação)

  // OPTIMIZATION: Memoize Users Map and Anomalies Map for faster lookups
  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(u => map.set(String(u.id), u));
    return map;
  }, [users]);

  const anomaliesMap = useMemo(() => {
    const map = new Map<number, Anomaly>();
    anomalies.filter(a => a.type === 'LATE_ENTRY').forEach(a => map.set(a.timeLogId, a));
    return map;
  }, [anomalies]);

  // Optimization: Memoize Rich Logs (joining logs with user data)
  // Replaced O(L * U) with O(L) using Map lookup
  const richLogs = useMemo(() => {
    return logs.map(log => {
      const user = usersMap.get(String(log.userId));
      const logAnomaly = anomaliesMap.get(log.id);
      return { ...log, user, anomaly: logAnomaly };
    }).filter(item => item.user !== undefined);
  }, [logs, usersMap, anomaliesMap]);

  // Optimization: Memoize Filtered Logs specifically for Daily View
  const filteredDailyLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();

    // 1. Filtering
    let result = richLogs.filter(item => {
      let matchDate = true;
      if (filterDateMode === 'single') {
        matchDate = filterDate ? item.date === filterDate : true;
      } else {
        const start = filterDate || '0000-00-00';
        const end = filterDateEnd || '9999-12-31';
        matchDate = item.date >= start && item.date <= end;
      }

      const matchDept = filterDepartment ? item.user?.department === filterDepartment : true;
      const matchUser = filterUserId ? item.userId.toString() === filterUserId : true;

      if (!matchDate || !matchDept || !matchUser) return false;

      // Status Filter logic
      if (filterStatus) {
        if (filterStatus === 'INCOMPLETE' && item.checkOut) return false;
        if (filterStatus === 'LATE' || filterStatus === 'EARLY') {
          if (!item.user?.workStartTime) return false;
          const startMins = timeToMinutes(item.user.workStartTime);
          const checkInMins = timeToMinutes(item.checkIn);
          const isLate = item.checkIn && (checkInMins > startMins + 30);
          if (filterStatus === 'LATE' && !isLate) return false;
        }
      }

      return (
        item.user?.name.toLowerCase().includes(term) ||
        item.user?.id.toString().includes(term)
      );
    });

    // 2. Sorting (Latest First by default)
    result.sort((a, b) => {
      // Primary: Date
      if (a.date !== b.date) {
        return sortOrder === 'desc'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      }
      // Secondary: CheckIn Time
      const timeA = a.checkIn || '';
      const timeB = b.checkIn || '';
      return sortOrder === 'desc'
        ? timeB.localeCompare(timeA)
        : timeA.localeCompare(timeB);
    });

    return result;
  }, [richLogs, filterDate, filterDateEnd, filterDateMode, searchTerm, filterDepartment, filterUserId, filterStatus, sortOrder]);

  const pendingIncompleteLogs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return richLogs.filter(l => !l.checkOut && l.date < today && !notifiedLogIds.includes(l.id));
  }, [richLogs, notifiedLogIds]);

  // OPTIMIZATION: Pre-group logs by user to avoid O(U * L) filtering inside timeBankData
  const userLogsMap = useMemo(() => {
    const map = new Map<string, TimeLog[]>();
    richLogs.forEach(log => {
      if (log.totalHours) {
        const uid = String(log.userId);
        if (!map.has(uid)) map.set(uid, []);
        map.get(uid)!.push(log);
      }
    });
    return map;
  }, [richLogs]);

  const timeBankData = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return users.map(user => {
      const matchesDept = filterDepartment ? user.department === filterDepartment : true;
      const matchesUser = filterUserId ? user.id.toString() === filterUserId : true;

      if (!matchesDept || !matchesUser) return null;

      if (term && !user.name.toLowerCase().includes(term)) return null;

      const userLogs = userLogsMap.get(String(user.id)) || [];

      let expectedMinutesPerDay = 8 * 60;
      if (user.workStartTime && user.workEndTime) {
        const startMins = timeToMinutes(user.workStartTime);
        const endMins = timeToMinutes(user.workEndTime);
        let rawDiff = endMins - startMins;
        if (rawDiff > 5 * 60) rawDiff -= 60;
        expectedMinutesPerDay = rawDiff;
      }
      const expectedHoursPerDay = expectedMinutesPerDay / 60;

      let totalWorkedMinutes = 0;
      let totalBalanceMinutes = 0;
      let daysWorked = 0;

      userLogs.forEach(log => {
        if (!log.totalHours) return;
        daysWorked++;
        const workedMinutes = Math.round(log.totalHours * 60);
        totalWorkedMinutes += workedMinutes;
        const diff = workedMinutes - expectedMinutesPerDay;
        // No 30 minute minimum blocks, keep exact differences
        totalBalanceMinutes += diff;
      });

      // Include manual adjustments
      const userAdj = hourBankAdjustments.filter(a => Number(a.userId) === Number(user.id));
      const adjMinutes = userAdj.reduce((sum, a) => sum + a.adjustmentMinutes, 0);
      totalBalanceMinutes += adjMinutes;

      return {
        user,
        daysWorked,
        totalWorked: totalWorkedMinutes / 60,
        expectedHours: (daysWorked * expectedHoursPerDay),
        balance: totalBalanceMinutes / 60,
        adjustmentMinutes: adjMinutes,
        schedule: user.workStartTime && user.workEndTime ? `${user.workStartTime}-${user.workEndTime}` : '09:00-18:00'
      };
    }).filter(item => item !== null);
  }, [richLogs, users, searchTerm, filterDepartment, filterUserId, hourBankAdjustments]);

  const dailyStats = useMemo(() => {
    return {
      present: filteredDailyLogs.length,
      late: filteredDailyLogs.filter(l => l.status === TimeLogStatus.LATE).length,
      incomplete: filteredDailyLogs.filter(l => !l.checkOut && l.date !== new Date().toISOString().split('T')[0]).length,
      totalHours: filteredDailyLogs.reduce((acc, curr) => {
        // Use totalHours if greater than 0, otherwise recalculate
        const hours = (curr.totalHours && curr.totalHours > 0) ? curr.totalHours : calculateTotalHours(curr);
        return acc + (hours || 0);
      }, 0)
    };
  }, [filteredDailyLogs]);

  // Helper for display
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Optimization: Memoize checkDeviations to prevent recalculation during rendering
  const checkDeviations = useCallback((log: TimeLog) => {
    if (!log.user?.workStartTime || !log.user?.workEndTime) return null;

    const deviations: Array<{ type: string; diff: number; label: string; severity: 'warning' | 'critical' }> = [];
    const checkInMins = timeToMinutes(log.checkIn);
    const startMins = timeToMinutes(log.user.workStartTime);
    const checkOutMins = timeToMinutes(log.checkOut);
    const endMins = timeToMinutes(log.user.workEndTime);

    if (log.checkIn && checkInMins > startMins + 30) {
      // Get tolerance from user's location
      const userLocation = locations.find(l => l.id === log.user?.locationId);
      const toleranceEntry = userLocation?.toleranceEntry ?? 30;
      if (checkInMins > startMins + toleranceEntry) {
        const diff = checkInMins - startMins;
        const severity: 'warning' | 'critical' = diff < TOLERANCE_CRITICAL ? 'warning' : 'critical';
        deviations.push({
          type: 'LATE',
          diff,
          label: severity === 'warning' ? `Atraso moderado (${formatDuration(diff)})` : `Atraso crítico (${formatDuration(diff)})`,
          severity
        });
      }
    }

    if (log.checkOut && checkOutMins < endMins) {
      // Get exit tolerance from user's location
      const userLocation = locations.find(l => l.id === log.user?.locationId);
      const toleranceExit = userLocation?.toleranceExit ?? 30;
      if (checkOutMins < endMins - toleranceExit) {
        const diff = endMins - checkOutMins;
        const severity: 'warning' | 'critical' = diff < TOLERANCE_CRITICAL ? 'warning' : 'critical';
        deviations.push({
          type: 'EARLY',
          diff,
          label: `Saiu ${formatDuration(diff)} cedo`,
          severity
        });
      }
    }

    return deviations;
  }, [locations, TOLERANCE_CRITICAL]);

  // ⚙️ NOVO: Usar configuração centralizada
  // Import no topo do arquivo já foi feito

  useEffect(() => {
    // SEGURANÇA: Verificar se sistema está ativo
    if (!ANOMALY_CONFIG.ENABLED || !ANOMALY_CONFIG.ENABLE_AUTO_DETECTION) {
      if (ANOMALY_CONFIG.DEBUG.enabled) {
        console.log('[Anomalies] 🔴 Auto-detection DISABLED');
        console.log('[Anomalies] → System:', ANOMALY_CONFIG.ENABLED);
        console.log('[Anomalies] → Detection:', ANOMALY_CONFIG.ENABLE_AUTO_DETECTION);
      }
      return;
    }

    console.log('[Anomalies] ✅ Auto-detection ACTIVE (silencioso)');

    const createAnomaliesForCriticalDelays = async () => {
      if (!currentUser || (currentUser.role !== UserRole.ADMIN && !isAdminRole(normalizeRoleName(currentUser.role || '')))) {
        return; // Only admins and HR can auto-create anomalies
      }

      let createdAnomaliesCount = 0; // Track number of anomalies created

      for (const log of richLogs) {
        if (!log.user) continue;

        const deviations = checkDeviations(log);
        const lateDev = deviations?.find(d => d.type === 'LATE');

        // Only create for critical delays (≥15 minutes)
        if (!lateDev || lateDev.severity !== 'critical') continue;

        // Check if anomaly already exists for this log
        const existingAnomaly = anomalies.find(a => a.timeLogId === log.id && a.type === 'LATE_ENTRY');
        if (existingAnomaly) continue; // Already has an anomaly

        // Create new anomaly in database with all required fields
        try {
          const today = new Date().toISOString().split('T')[0];
          const severity = lateDev.diff >= 30 ? 'CRITICAL' :
                          lateDev.diff >= 15 ? 'HIGH' :
                          lateDev.diff >= 10 ? 'MEDIUM' : 'LOW';

          const { data: newAnomaly, error} = await supabase
            .from('anomalies')
            .insert({
              user_id: log.userId,
              time_log_id: log.id,
              type: 'LATE_ENTRY',
              date: today,
              description: `Entrada tardia: ${lateDev.diff} minutos de atraso`,
              severity: severity,
              status: ANOMALY_CONFIG.DEFAULT_STATUS, // ✅ NOVO: Usa 'DETECTED' (silencioso)
              detected_at: new Date().toISOString(),
              detected_by: 'SYSTEM',
              metadata: {
                minutes: lateDev.diff,
                auto_detected: true,
                workflow: 'silent_detection' // Marca que é novo workflow
              }
            })
            .select()
            .single();

          if (error) {
            // Erro 23505 = duplicate key (OK, já existe)
            if (error.code === '23505') {
              console.log(`[Anomaly] Duplicate prevented for log ${log.id}`);
              continue;
            }

            console.error('Error auto-creating anomaly:', error);
            console.error('Full error details:', JSON.stringify(error, null, 2));

            // Show error to admin/RH users
            if (currentUser.role === UserRole.ADMIN || isAdminRole(normalizeRoleName(currentUser.role || ''))) {
              addToast('error', `Erro ao criar anomalia: ${error.message}`);
            }
          } else if (newAnomaly) {
            // ✅ NOVO: Log silencioso (não notifica colaborador)
            console.log(`[Anomaly] 🔇 Created silently - User: ${log.user?.name}, Delay: ${lateDev.diff}min, ID: ${newAnomaly.id}`);
            createdAnomaliesCount++;

            // ⚠️ NOTA: NÃO enviar notificação aqui!
            // Colaborador só será notificado quando gestor pedir justificação
          }
        } catch (err) {
          console.error('Exception creating anomaly:', err);
          if (currentUser.role === UserRole.ADMIN || isAdminRole(normalizeRoleName(currentUser.role || ''))) {
            addToast('error', 'Erro inesperado ao criar anomalia');
          }
        }
      }

      // ✅ NOVO: Feedback silencioso para gestores (não alarmar)
      if (createdAnomaliesCount > 0 && (currentUser.role === UserRole.ADMIN || isAdminRole(normalizeRoleName(currentUser.role || '')))) {
        if (ANOMALY_CONFIG.DEBUG.enabled) {
          console.log(`[Anomaly] 📊 Criadas ${createdAnomaliesCount} anomalias silenciosamente`);
          // Toast discreto apenas para gestores saberem que sistema está funcional
          addToast('info', `${createdAnomaliesCount} anomalia(s) detetada(s) (silencioso - ver dashboard)`, 3000);
        }
      }
    };

    createAnomaliesForCriticalDelays();
  }, [richLogs, anomalies, currentUser, checkDeviations, onUpdateAnomaly]);

  const handleSendNotifications = async () => {
    if (pendingIncompleteLogs.length === 0) return;
    setIsNotifying(true);

    let sentCount = 0;
    const errors: any[] = [];
    const newNotifiedIds: number[] = [];

    for (const log of pendingIncompleteLogs) {
      if (!log.user) continue;

      const message = {
        sender_id: currentUser?.id || 'SYSTEM',
        receiver_id: log.userId,
        subject: 'Falha no Registo de Ponto',
        content: `Foi detetada uma falha no seu registo de ponto do dia ${new Date(log.date).toLocaleDateString('pt-PT')} (Sem Saída ou Incompleto). Por favor justifique ou regularize a situação.`,
        date: new Date().toISOString(),
        read: false,
        priority: 'NORMAL'
      };

      const { error } = await supabase.from('internal_messages').insert(message);
      if (error) {
        errors.push(error);
      } else {
        sentCount++;
        newNotifiedIds.push(log.id);
      }
    }

    setIsNotifying(false);

    if (newNotifiedIds.length > 0) {
      setNotifiedLogIds(prev => [...prev, ...newNotifiedIds]);
    }

    if (sentCount > 0) {
      addToast('success', `Notificação enviada para ${sentCount} colaboradores.`);
    }
    if (errors.length > 0) {
      console.error("Errors sending notifications:", errors);
      if (sentCount === 0) addToast('error', 'Erro ao enviar notificações.');
    }
  };

  // ✅ NOVO: Funções para gerir anomalias
  const handleJustifyAnomaly = async () => {
    if (!anomalyPopupLog) return;

    setIsProcessingAnomaly(true);
    try {
      // 1. Criar ou atualizar anomalia para status "RESOLVED"
      const { data: existingAnomaly } = await supabase
        .from('anomalies')
        .select('*')
        .eq('time_log_id', anomalyPopupLog.id)
        .maybeSingle();

      if (existingAnomaly) {
        // Atualizar existente
        await supabase
          .from('anomalies')
          .update({
            status: 'RESOLVED',
            resolved_by: currentUser?.id,
            resolved_at: new Date().toISOString(),
            resolution: anomalyNote || 'Justificado pelo responsável'
          })
          .eq('id', existingAnomaly.id);
      }

      addToast('success', 'Anomalia justificada com sucesso');
      setAnomalyPopupLog(null);
      setAnomalyNote('');
    } catch (err) {
      console.error('Error justifying anomaly:', err);
      addToast('error', 'Erro ao justificar anomalia');
    } finally {
      setIsProcessingAnomaly(false);
    }
  };

  // 🔵 NOVA: Pedir Justificação ao Colaborador
  const handleRequestJustification = async () => {
    if (!anomalyPopupLog) return;

    setIsProcessingAnomaly(true);
    try {
      // 1. Atualizar ou criar anomalia com status "AWAITING_JUSTIFICATION"
      const { data: existingAnomaly } = await supabase
        .from('anomalies')
        .select('*')
        .eq('time_log_id', anomalyPopupLog.id)
        .maybeSingle();

      if (existingAnomaly) {
        await supabase
          .from('anomalies')
          .update({
            status: 'AWAITING_JUSTIFICATION',
            resolution_note: anomalyNote || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAnomaly.id);
      } else {
        // Criar nova anomalia
        const deviations = checkDeviations(anomalyPopupLog);
        const lateDev = deviations?.find(d => d.type === 'LATE');

        await supabase.from('anomalies').insert({
          user_id: anomalyPopupLog.userId,
          time_log_id: anomalyPopupLog.id,
          type: 'LATE_ENTRY',
          date: anomalyPopupLog.date,
          description: `Entrada tardia: ${lateDev?.diff || 0} minutos`,
          severity: lateDev?.severity === 'critical' ? 'CRITICAL' : 'HIGH',
          status: 'AWAITING_JUSTIFICATION',
          resolution_note: anomalyNote || null,
          detected_at: new Date().toISOString(),
          detected_by: currentUser?.id || 'SYSTEM'
        });
      }

      // 2. Notificar colaborador solicitando justificação
      await supabase.from('internal_messages').insert({
        sender_id: currentUser?.id || 'SYSTEM',
        receiver_id: anomalyPopupLog.userId,
        subject: '📋 Solicitação de Justificação',
        content: `Olá ${anomalyPopupLog.user?.name},

O seu responsável de departamento solicita uma justificação para o seguinte registo:

📅 Data: ${new Date(anomalyPopupLog.date).toLocaleDateString('pt-PT')}
⏰ Entrada: ${anomalyPopupLog.checkIn}
⏰ Saída: ${anomalyPopupLog.checkOut || 'Não registada'}
${anomalyNote ? `\n📝 Nota do responsável: ${anomalyNote}` : ''}

Por favor, aceda ao Portal e forneça uma justificação.

Obrigado.`,
        date: new Date().toISOString(),
        read: false,
        priority: 'HIGH'
      });

      addToast('success', 'Justificação solicitada. Colaborador foi notificado.');
      setAnomalyPopupLog(null);
      setAnomalyNote('');
    } catch (err) {
      console.error('Error requesting justification:', err);
      addToast('error', 'Erro ao solicitar justificação');
    } finally {
      setIsProcessingAnomaly(false);
    }
  };

  // 🟠 Encaminhar para RH (sem notificar colaborador)
  const handleForwardToRH = async () => {
    if (!anomalyPopupLog) return;

    setIsProcessingAnomaly(true);
    try {
      // 1. Atualizar anomalia para "FORWARDED_TO_HR"
      const { data: existingAnomaly } = await supabase
        .from('anomalies')
        .select('*')
        .eq('time_log_id', anomalyPopupLog.id)
        .maybeSingle();

      if (existingAnomaly) {
        await supabase
          .from('anomalies')
          .update({
            status: 'FORWARDED_TO_HR',
            resolution_note: anomalyNote || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAnomaly.id);
      } else {
        // Criar nova anomalia
        const deviations = checkDeviations(anomalyPopupLog);
        const lateDev = deviations?.find(d => d.type === 'LATE');

        await supabase.from('anomalies').insert({
          user_id: anomalyPopupLog.userId,
          time_log_id: anomalyPopupLog.id,
          type: 'LATE_ENTRY',
          date: anomalyPopupLog.date,
          description: `Entrada tardia: ${lateDev?.diff || 0} minutos`,
          severity: lateDev?.severity === 'critical' ? 'CRITICAL' : 'HIGH',
          status: 'FORWARDED_TO_HR',
          resolution_note: anomalyNote || null,
          detected_at: new Date().toISOString(),
          detected_by: currentUser?.id || 'SYSTEM'
        });
      }

      // 2. Notificar RH (não o colaborador!)
      const { data: hrUsers } = await supabase
        .from('users')
        .select('id')
        .ilike('role', '%RH%');

      if (hrUsers && hrUsers.length > 0) {
        for (const hrUser of hrUsers) {
          await supabase.from('internal_messages').insert({
            sender_id: currentUser?.id || 'SYSTEM',
            receiver_id: hrUser.id,
            subject: '📋 Ausência Encaminhada - Requer Atenção',
            content: `Uma ausência/anomalia foi encaminhada para análise de RH:

👤 Colaborador: ${anomalyPopupLog.user?.name}
📅 Data: ${new Date(anomalyPopupLog.date).toLocaleDateString('pt-PT')}
⏰ Entrada: ${anomalyPopupLog.checkIn}
⏰ Saída: ${anomalyPopupLog.checkOut || 'Não registada'}
${anomalyNote ? `\n📝 Nota do responsável: ${anomalyNote}` : ''}

Por favor, analise no sistema de Controlo de Assiduidade.`,
            date: new Date().toISOString(),
            read: false,
            priority: 'HIGH'
          });
        }
      }

      addToast('success', 'Ausência encaminhada para RH');
      setAnomalyPopupLog(null);
      setAnomalyNote('');
    } catch (err) {
      console.error('Error forwarding to RH:', err);
      addToast('error', 'Erro ao encaminhar para RH');
    } finally {
      setIsProcessingAnomaly(false);
    }
  };

  const handleRejectAnomaly = async () => {
    if (!anomalyPopupLog || !anomalyNote) {
      addToast('error', 'Por favor, adicione uma nota explicando a rejeição');
      return;
    }

    setIsProcessingAnomaly(true);
    try {
      const { data: existingAnomaly } = await supabase
        .from('anomalies')
        .select('*')
        .eq('time_log_id', anomalyPopupLog.id)
        .maybeSingle();

      if (existingAnomaly) {
        await supabase
          .from('anomalies')
          .update({
            status: 'UNRESOLVED',
            resolved_by: currentUser?.id,
            resolved_at: new Date().toISOString(),
            resolution: `REJEITADO: ${anomalyNote}`
          })
          .eq('id', existingAnomaly.id);
      }

      // Notificar colaborador da rejeição
      await supabase.from('internal_messages').insert({
        sender_id: currentUser?.id || 'SYSTEM',
        receiver_id: anomalyPopupLog.userId,
        subject: '⚠️ Justificação Não Aceite',
        content: `Olá ${anomalyPopupLog.user?.name},

A sua justificação para o registo de ${new Date(anomalyPopupLog.date).toLocaleDateString('pt-PT')} não foi aceite.

Motivo: ${anomalyNote}

Por favor, contacte o seu responsável para mais informações.`,
        date: new Date().toISOString(),
        read: false,
        priority: 'HIGH'
      });

      addToast('success', 'Anomalia rejeitada e colaborador notificado');
      setAnomalyPopupLog(null);
      setAnomalyNote('');
    } catch (err) {
      console.error('Error rejecting anomaly:', err);
      addToast('error', 'Erro ao rejeitar anomalia');
    } finally {
      setIsProcessingAnomaly(false);
    }
  };


  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <Header title="Controlo de Assiduidade" subtitle="Operações de ponto e análise de banco de horas" />

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-8">
        {[
          { id: 'daily', label: 'Diário', icon: Clock },
          { id: 'bank', label: 'Banco de Horas', icon: Hourglass }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${currentTab === tab.id
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Status (Todos)</option>
            <option value="INCOMPLETE">Em Curso / Incompleto</option>
            <option value="LATE">Em Atraso</option>
          </select>

          <SearchableSelect
            options={[
              { id: '', label: 'Colaborador (Todos)' },
              ...users.sort((a, b) => a.name.localeCompare(b.name)).map(u => ({
                id: u.id,
                label: u.name,
                sublabel: u.department
              }))
            ]}
            value={filterUserId}
            onChange={(id) => setFilterUserId(id)}
            placeholder="Pesquisar colaborador..."
          />

          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Departamento (Todos)</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>

          {/* Sorting Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100"
            title={sortOrder === 'asc' ? 'Mais antigos primeiro' : 'Mais recentes primeiro'}
          >
            {sortOrder === 'desc' ? '⬇ Recentes' : '⬆ Antigos'}
          </button>
        </div>

        <div className="flex gap-3">
          {currentTab === 'daily' && (
            <>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setFilterDateMode('single')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterDateMode === 'single' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                >Dia Único</button>
                <button
                  onClick={() => setFilterDateMode('range')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterDateMode === 'range' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                >Intervalo</button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
                />
                {filterDateMode === 'range' && (
                  <>
                    <span className="text-gray-400 font-bold px-1">-</span>
                    <input
                      type="date"
                      value={filterDateEnd}
                      min={filterDate}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
                    />
                  </>
                )}
              </div>
            </>
          )}

          <button onClick={() => navigate('/admin/attendance/manual-entry')} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={16} /> <span className="hidden md:inline">Lançar Ponto</span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      < div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]" >

        {/* --- DAILY VIEW --- */}
        {
          currentTab === 'daily' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setActiveKpiFilter(activeKpiFilter === 'all' ? null : 'all')}
                  className={`p-4 text-center border-b lg:border-b-0 border-gray-100 transition-all hover:bg-gray-100 ${activeKpiFilter === 'all' ? 'ring-2 ring-inset ring-brand-500 bg-brand-50' : ''}`}
                >
                  <div className="text-2xl font-bold text-gray-800">{dailyStats.present}</div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Presentes</div>
                </button>
                <button
                  onClick={() => { setActiveKpiFilter(activeKpiFilter === 'late' ? null : 'late'); setFilterStatus(activeKpiFilter === 'late' ? '' : 'LATE'); }}
                  className={`p-4 text-center border-b lg:border-b-0 border-gray-100 transition-all hover:bg-red-50 ${activeKpiFilter === 'late' ? 'ring-2 ring-inset ring-red-500 bg-red-50' : ''}`}
                >
                  <div className="text-2xl font-bold text-red-600">{dailyStats.late}</div>
                  <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Atrasos</div>
                  {activeKpiFilter === 'late' && <div className="text-[9px] text-red-500 mt-1">✓ Filtro ativo</div>}
                </button>
                <button
                  onClick={() => { setActiveKpiFilter(activeKpiFilter === 'incomplete' ? null : 'incomplete'); setFilterStatus(activeKpiFilter === 'incomplete' ? '' : 'INCOMPLETE'); }}
                  className={`p-4 text-center transition-all hover:bg-orange-50 ${activeKpiFilter === 'incomplete' ? 'ring-2 ring-inset ring-orange-500 bg-orange-50' : ''}`}
                >
                  <div className="text-2xl font-bold text-orange-600">{dailyStats.incomplete}</div>
                  <div className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Incompletos</div>
                  {activeKpiFilter === 'incomplete' && <div className="text-[9px] text-orange-500 mt-1">✓ Filtro ativo</div>}
                </button>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold text-brand-600">{formatHoursHumanized(dailyStats.totalHours)}</div>
                  <div className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">Total Horas</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-white">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-brand-600' : 'text-gray-400'}`}><List size={16} /></button>
                  <button onClick={() => setViewMode('map')} className={`p-1.5 rounded transition-all ${viewMode === 'map' ? 'bg-white shadow text-brand-600' : 'text-gray-400'}`}><MapIcon size={16} /></button>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="overflow-x-auto">
                  {/* Bulk Actions Bar */}
                  {selectedLogs.length > 0 && (
                    <div className="bg-brand-50 border-b border-brand-200 p-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-700">{selectedLogs.length} selecionado{selectedLogs.length > 1 ? 's' : ''}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            addToast('success', `Regularização solicitada para ${selectedLogs.length} registos.`);
                            setSelectedLogs([]);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700"
                        >
                          <CheckSquare size={14} /> Encerrar Turno
                        </button>
                        <button
                          onClick={() => {
                            addToast('info', `Justificação solicitada para ${selectedLogs.length} colaboradores.`);
                            setSelectedLogs([]);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-brand-600 border border-brand-200 rounded-lg text-xs font-bold hover:bg-brand-50"
                        >
                          <MessageSquare size={14} /> Pedir Justificação
                        </button>
                        <button onClick={() => setSelectedLogs([])} className="text-gray-400 hover:text-gray-600">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedLogs.length === filteredDailyLogs.length && filteredDailyLogs.length > 0}
                            onChange={(e) => setSelectedLogs(e.target.checked ? filteredDailyLogs.map(l => l.id) : [])}
                            className="w-4 h-4 rounded border-gray-300 text-brand-600"
                          />
                        </th>
                        <th className="px-4 py-4">Colaborador</th>
                        {filterDateMode === 'range' && <th className="px-4 py-4">Data</th>}
                        <th className="px-4 py-4">Entrada</th>
                        <th className="px-4 py-4">Saída</th>
                        <th className="px-4 py-4 text-center">Pausa</th>
                        <th className="px-4 py-4 text-center">Duração</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4 w-20">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDailyLogs.map(log => {
                        const deviations = checkDeviations(log);
                        const isLate = deviations?.some(d => d.type === 'LATE');
                        const isEarly = deviations?.some(d => d.type === 'EARLY');
                        const lateDev = deviations?.find(d => d.type === 'LATE');
                        const isSelected = selectedLogs.includes(log.id);
                        const isExpanded = expandedLogId === log.id;

                        // Location verification status
                        const hasValidLocation = log.checkInCoordinates || log.checkInLocation;

                        return (
                          <tr
                            key={log.id}
                            className={`group transition-colors ${isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                          >
                            {/* Checkbox */}
                            <td className="px-3 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => setSelectedLogs(prev => e.target.checked
                                  ? [...prev, log.id]
                                  : prev.filter(id => id !== log.id)
                                )}
                                className="w-4 h-4 rounded border-gray-300 text-brand-600"
                              />
                            </td>

                            {/* User Info */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img src={log.user?.photoUrl} className="w-10 h-10 rounded-full border border-gray-200" alt="" />
                                <div>
                                  <p className="font-bold text-sm text-gray-800">{log.user?.name}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                    <span>{log.user?.department}</span>
                                    <span className="font-mono bg-gray-100 px-1 rounded">{log.user?.workStartTime}-{log.user?.workEndTime}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Date (in range view) */}
                            {filterDateMode === 'range' && (
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className="text-sm font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                  {new Date(log.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                </span>
                              </td>
                            )}

                            {/* Check In - Progressive Disclosure */}
                            <td className="px-4 py-4">
                              <div className={`font-mono font-bold text-lg flex items-center gap-2 ${isLate ? (lateDev?.severity === 'critical' ? 'text-red-600' : 'text-amber-600') : 'text-gray-800'}`}>
                                {log.checkIn}
                                {isLate && (lateDev?.severity === 'critical'
                                  ? <ShieldAlert size={14} className="text-red-500" />
                                  : <ShieldAlert size={14} className="text-amber-500" />
                                )}
                              </div>
                              {/* Progressive Disclosure: Location Icon */}
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${hasValidLocation ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                                  title={hasValidLocation ? 'Localização verificada' : 'Localização não verificada'}
                                >
                                  {hasValidLocation ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                                  {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                </button>
                              </div>
                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="mt-2 space-y-1 animate-fade-in">
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                    <MapPin size={10} className="text-gray-400" /> {log.checkInLocation || 'N/A'}
                                  </div>
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                    <Globe size={10} className="text-gray-400" /> IP: {log.checkInIp || 'N/A'}
                                  </div>
                                  {(log.checkInCoordinates || log.checkInLocation?.includes('GPS:')) && (
                                    <a
                                      href={log.checkInCoordinates
                                        ? `https://www.google.com/maps?q=${log.checkInCoordinates.lat},${log.checkInCoordinates.lng}`
                                        : `https://www.google.com/maps?q=${log.checkInLocation?.replace('GPS: ', '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-brand-600 flex items-center gap-1.5 bg-brand-50 px-2 py-1 rounded hover:underline"
                                    >
                                      <MapIcon size={10} /> Ver no Mapa
                                    </a>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {log.checkOut || isAnomalyCheckout(log.checkOut, log.status) ? (
                                isAnomalyCheckout(log.checkOut, log.status) ? (
                                  // Special case for unclosed sessions
                                  <div className="space-y-1">
                                    <div className="font-mono font-bold text-lg text-red-600">
                                      {log.checkOut || '--:--'}
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                      <AlertTriangle size={10} /> SESSÃO NÃO ENCERRADA
                                    </span>
                                    <p className="text-[9px] text-red-500 mt-1">
                                      Requer correção manual
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className={`font-mono font-bold text-lg ${isEarly ? 'text-orange-600' : 'text-gray-800'}`}>
                                      {log.checkOut}
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-2 space-y-1 animate-fade-in">
                                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                          <MapPin size={10} className="text-gray-400" /> {log.checkOutLocation || 'N/A'}
                                        </div>
                                        {(log.checkOutCoordinates || log.checkOutLocation?.includes('GPS:')) && (
                                          <a
                                            href={log.checkOutCoordinates
                                              ? `https://www.google.com/maps?q=${log.checkOutCoordinates.lat},${log.checkOutCoordinates.lng}`
                                              : `https://www.google.com/maps?q=${log.checkOutLocation?.replace('GPS: ', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-brand-600 flex items-center gap-1.5 bg-brand-50 px-2 py-1 rounded hover:underline"
                                          >
                                            <MapIcon size={10} /> Ver no Mapa
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded animate-pulse">
                                  <Clock size={12} /> Em curso
                                </span>
                              )}
                            </td>

                            {/* Pausa Refeição (Auto) */}
                            <td className="px-4 py-4 text-center">
                              {log.breakStart && log.breakEnd ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-mono text-sm font-semibold text-gray-700">
                                    {log.breakStart}–{log.breakEnd}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full">
                                    <Coffee size={9} /> Auto
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>

                            {/* Duration - Humanized */}
                            <td className="px-4 py-4 text-center">
                              <div className="font-mono font-bold text-gray-700 text-lg">
                                {log.checkOut ? (
                                  formatHoursHumanized((log.totalHours && log.totalHours > 0) ? log.totalHours : calculateTotalHours(log))
                                ) : (
                                  <span className="text-gray-400 text-sm italic">Em curso</span>
                                )}
                              </div>
                            </td>

                            {/* Status with Severity */}
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1.5">
                                {deviations && deviations.length > 0 ? (
                                  <>
                                    {deviations.map((dev, i) => (
                                      <span
                                        key={i}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase border w-fit ${dev.severity === 'critical'
                                          ? 'bg-red-50 text-red-600 border-red-200'
                                          : 'bg-amber-50 text-amber-600 border-amber-200'
                                          }`}
                                      >
                                        {dev.severity === 'critical' ? <ShieldAlert size={10} /> : <AlertTriangle size={10} />}
                                        {dev.label}
                                      </span>
                                    ))}
                                    {/* Show Anomaly Status if specifically for LATE/EARLY */}
                                    {(log as any).anomaly && (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border w-fit ${(log as any).anomaly.status === 'AWAITING_JUSTIFICATION'
                                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                                        : (log as any).anomaly.status === 'PENDING'
                                        ? 'bg-orange-100 text-orange-700 border-orange-300'
                                        : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                        <MessageSquare size={8} />
                                        {(log as any).anomaly.status === 'AWAITING_JUSTIFICATION'
                                          ? 'Aguarda Justificação'
                                          : (log as any).anomaly.status === 'PENDING'
                                          ? 'Anomalia Criada'
                                          : (log as any).anomaly.status}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-50 text-green-600 border border-green-100 w-fit">
                                    <ShieldCheck size={10} /> Horário Cumprido
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-1">
                                {/* ⚠️ NOVO: Botão de anomalia (se existir desvio crítico) */}
                                {deviations && deviations.some(d => d.severity === 'critical') && (
                                  <button
                                    onClick={() => {
                                      setAnomalyPopupLog(log);
                                      setAnomalyNote('');
                                    }}
                                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors animate-pulse"
                                    title="Gerir Anomalia"
                                  >
                                    <AlertTriangle size={16} />
                                  </button>
                                )}

                                <button
                                  onClick={() => navigate(`/admin/attendance/manual-entry?edit=${log.id}`)}
                                  className="p-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                  title="Editar Ponto"
                                >
                                  <Edit3 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredDailyLogs.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">
                            Sem registos de ponto para esta data ou filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-[500px] bg-slate-100 flex items-center justify-center text-gray-400 relative">
                  <div className="text-center">
                    <MapIcon size={48} className="mx-auto mb-2 opacity-20" />
                    <p className="font-medium">Visualização de Mapa</p>
                    <p className="text-xs">A mostrar localizações de check-in para {filteredDailyLogs.length} colaboradores.</p>
                  </div>
                </div>
              )}
            </>
          )
        }

        {/* --- BANK VIEW --- */}
        {
          currentTab === 'bank' && (
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {timeBankData.map((data: any) => {
                  const userAdjustments = hourBankAdjustments.filter(a => Number(a.userId) === Number(data.user.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  const isExpanded = expandedUserId === data.user.id;
                  return (
                    <div key={data.user.id} className="border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white overflow-hidden">
                      <div className="flex flex-col md:flex-row items-center p-4">
                        <div className="flex items-center gap-4 w-full md:w-1/4">
                          <div className="relative">
                            <img src={data.user.photoUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="" />
                            <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${data.balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{data.user.name}</p>
                            <p className="text-xs text-gray-500">{getRoleDisplayName(data.user.role)}</p>
                          </div>
                        </div>

                        <div className="flex-1 w-full grid grid-cols-3 gap-4 text-center my-4 md:my-0">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 uppercase font-bold">Previsto</div>
                            <div className="font-mono font-bold text-gray-700">{formatHoursHumanized(data.expectedHours).replace('+', '')}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="text-[10px] text-gray-400 uppercase font-bold">Real</div>
                            <div className="font-mono font-bold text-gray-700">{formatHoursHumanized(data.totalWorked).replace('+', '')}</div>
                          </div>
                          <div className={`rounded-lg p-2 ${data.balance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className={`text-[10px] uppercase font-bold ${data.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Saldo</div>
                            <div className={`font-mono font-bold ${data.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatHoursHumanized(data.balance)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                          {onAddHourBankAdjustment && (
                            <button
                              onClick={() => { setAdjustModalUserId(data.user.id); setAdjustMinutes('30'); setAdjustSign('+'); setAdjustType('manual'); setAdjustReason(''); }}
                              className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                              <Edit3 size={12} /> Ajustar
                            </button>
                          )}
                          {userAdjustments.length > 0 && (
                            <button
                              onClick={() => setExpandedUserId(isExpanded ? null : data.user.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {userAdjustments.length} ajuste{userAdjustments.length !== 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable adjustment history */}
                      {isExpanded && userAdjustments.length > 0 && (
                        <div className="border-t border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-3">Histórico de Ajustes</p>
                          <div className="space-y-2">
                            {userAdjustments.map(adj => {
                              const creator = users.find(u => u.id === adj.createdBy);
                              return (
                                <div key={adj.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${adj.adjustmentMinutes >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {adj.adjustmentMinutes >= 0 ? '+' : ''}{(adj.adjustmentMinutes / 60).toFixed(1)}h
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-800">{adj.reason}</p>
                                      <p className="text-[10px] text-gray-400">
                                        {adj.type === 'manual' ? 'Manual' : adj.type === 'correction' ? 'Correção' : 'Reset'} &middot; {creator?.name || 'Sistema'} &middot; {new Date(adj.createdAt).toLocaleDateString('pt-PT')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Adjustment Modal */}
        {adjustModalUserId !== null && onAddHourBankAdjustment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Ajustar Banco de Horas</h3>
                  <button onClick={() => setAdjustModalUserId(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Colaborador: <span className="font-bold text-gray-800">{users.find(u => u.id === adjustModalUserId)?.name}</span>
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tipo de Operação</label>
                    <div className="flex gap-2">
                      <button onClick={() => setAdjustSign('+')} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${adjustSign === '+' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                        + Crédito
                      </button>
                      <button onClick={() => setAdjustSign('-')} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-colors ${adjustSign === '-' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                        - Débito
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Minutos</label>
                    <input
                      type="number"
                      min="1"
                      value={adjustMinutes}
                      onChange={e => setAdjustMinutes(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      placeholder="30"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Exemplo: 30 = 0.5h, 60 = 1h, 90 = 1.5h</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Categoria</label>
                    <select
                      value={adjustType}
                      onChange={e => setAdjustType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    >
                      <option value="manual">Manual</option>
                      <option value="correction">Correção</option>
                      <option value="reset">Reset</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Motivo *</label>
                    <textarea
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                      placeholder="Descreva o motivo do ajuste..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => setAdjustModalUserId(null)}
                  className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={!adjustReason.trim() || !adjustMinutes || Number(adjustMinutes) <= 0}
                  onClick={() => {
                    const mins = Number(adjustMinutes);
                    if (!mins || mins <= 0 || !adjustReason.trim()) return;
                    onAddHourBankAdjustment({
                      userId: adjustModalUserId,
                      adjustmentMinutes: adjustSign === '+' ? mins : -mins,
                      reason: adjustReason.trim(),
                      type: adjustType,
                      createdBy: currentUser?.id || 0
                    });
                    setAdjustModalUserId(null);
                  }}
                  className="flex-1 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors border-l border-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {
        deleteConfirmId !== null && canDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Apagar Registo de Ponto</h3>
                <p className="text-sm text-gray-500">
                  Tem a certeza que deseja apagar este registo? Esta ação é irreversível.
                </p>
              </div>
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteLog!(deleteConfirmId);
                    setSelectedLogs(prev => prev.filter(id => id !== deleteConfirmId));
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors border-l border-gray-100"
                >
                  Apagar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ⚠️ NOVO: Popup de Gestão de Anomalias */}
      {anomalyPopupLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-full">
                    <AlertTriangle className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Gestão de Ausências</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 mt-1">
                      {(() => {
                        const deviations = checkDeviations(anomalyPopupLog);
                        const critical = deviations?.filter(d => d.severity === 'critical').length || 0;
                        return critical;
                      })()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAnomalyPopupLog(null);
                    setAnomalyNote('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Body - Anomaly Details */}
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <img src={anomalyPopupLog.user?.photoUrl} className="w-16 h-16 rounded-full border-2 border-white shadow" alt="" />
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{anomalyPopupLog.user?.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{new Date(anomalyPopupLog.date).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}</span>
                  </div>
                </div>
              </div>

              {/* Anomaly Type */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="text-sm font-bold text-red-700">UNCLOSED_SESSION</span>
                  <span className="text-xs text-red-600 ml-auto">min</span>
                </div>

                {/* Deviation Details */}
                {(() => {
                  const deviations = checkDeviations(anomalyPopupLog);
                  return deviations?.map((dev, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      dev.severity === 'critical'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700">{dev.label}</span>
                        <span className={`text-xs font-bold uppercase ${
                          dev.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {dev.severity}
                        </span>
                      </div>
                      {dev.diff && (
                        <div className="mt-1 text-xs text-gray-600">
                          Diferença: <span className="font-mono font-bold">{dev.diff} minutos</span>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              {/* Note Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nota (opcional)...
                </label>
                <textarea
                  value={anomalyNote}
                  onChange={(e) => setAnomalyNote(e.target.value)}
                  placeholder="Adicione uma nota explicativa..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="p-6 border-t border-gray-100">
              <div className="flex items-center justify-between gap-3">
                {/* Botão Cancelar à esquerda */}
                <button
                  onClick={() => {
                    setAnomalyPopupLog(null);
                    setAnomalyNote('');
                  }}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isProcessingAnomaly}
                >
                  Cancelar
                </button>

                {/* Botões de ação à direita */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleJustifyAnomaly}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessingAnomaly}
                    title="Aceitar e resolver imediatamente"
                  >
                    <CheckCircle2 size={16} />
                    Justificar
                  </button>

                  <button
                    onClick={handleRequestJustification}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessingAnomaly}
                    title="Solicitar justificação ao colaborador"
                  >
                    <MessageSquare size={16} />
                    Pedir Justificação
                  </button>

                  <button
                    onClick={handleForwardToRH}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessingAnomaly}
                    title="Encaminhar para RH (não notifica colaborador)"
                  >
                    <UserIcon size={16} />
                    RH
                  </button>

                  <button
                    onClick={handleRejectAnomaly}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessingAnomaly}
                    title="Rejeitar justificação apresentada"
                  >
                    <X size={16} />
                    Rejeitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default AttendanceControl;
