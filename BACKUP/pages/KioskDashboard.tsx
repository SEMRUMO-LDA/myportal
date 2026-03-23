import React, { useState, useEffect, useMemo } from 'react';
import { User, TimeLog, Vehicle, Trip, AppEvent, InternalMessage, Leave, LeaveType, ScheduleTemplate, Location, Department, HourBankAdjustment, Anomaly } from '../types';
import { Play, Square, Settings, LogOut, MapPin, Globe, Car, Route, Calendar, ChevronRight, CheckCircle2, Receipt, Search, X, Clock, ReceiptEuro, MessageSquare, Users, Coffee, TreePalm, CreditCard, AlertTriangle, Bell, Menu, Loader2, User as UserIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchVehicleByUserId, fetchActiveTrip, startTrip, endTrip, assignFreeVehicleToUser, fetchVehicles, fetchLastTrip, fetchUserTopVehicles, fetchVehicleById } from '../services/fleetService';
import { supabase } from '../services/supabaseClient';
import { formatHoursHumanized } from '../utils/scheduleUtils';
import { calculateVacationBalance } from '../components/VacationBalanceCard';
import ExpenseModal from '../components/ExpenseModal';
import VehicleBookingModal from '../components/VehicleBookingModal';
import KioskLoadingScreen from '../components/KioskLoadingScreen';
import PulseSurveyWidget from '../components/PulseSurveyWidget';
import ProfileCompletionModal from '../components/ProfileCompletionModal';
import LeoAssistant from '../components/LeoAssistant';
import CollaboratorCard from '../components/CollaboratorCard';
import ClockButton from '../components/ClockButton';
import { useToast } from '../context/ToastContext';
import { checkAndCloseOpenSessions, isAnomalyCheckout } from '../utils/sessionChecker';
import TodayCompanyDashboard from '../components/TodayCompany/TodayCompanyDashboard';
import FleetWidget from '../components/TodayCompany/FleetWidget';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

interface KioskDashboardProps {
    user: User;
    onClockIn: (user: User) => void;
    onBreakStart?: (user: User) => void;
    onBreakEnd?: (user: User) => void;
    onClockOut: (user: User) => void;
    onLogout: () => void;
    lastLog?: TimeLog;
    events?: AppEvent[];
    messages?: InternalMessage[];
    timeLogs?: TimeLog[];
    hourBankAdjustments?: HourBankAdjustment[];
    leaves?: Leave[];
    leaveTypes?: LeaveType[];
    scheduleTemplates?: ScheduleTemplate[];
    dataReady?: boolean;
}

const KioskDashboard: React.FC<KioskDashboardProps> = ({ user, onClockIn, onBreakStart, onBreakEnd, onClockOut, onLogout, lastLog, messages = [], timeLogs = [], hourBankAdjustments = [], leaves = [], leaveTypes = [], scheduleTemplates = [], dataReady = true }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Vehicle/Trip state
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [showTripModal, setShowTripModal] = useState(false);
    const [showVehicleSearch, setShowVehicleSearch] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [suggestedVehicles, setSuggestedVehicles] = useState<Vehicle[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [tripKm, setTripKm] = useState(0);
    const [tripDestination, setTripDestination] = useState('');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [isDeepLinking, setIsDeepLinking] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);

    // Pulse Survey State
    const [surveyCompletedThisWeek, setSurveyCompletedThisWeek] = useState(true); // Assume true initially to prevent flash
    const [showSurvey, setShowSurvey] = useState(false);

    // Profile Completion State
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);

    // Collaborator Card Lightbox
    const [showCardModal, setShowCardModal] = useState(false);

    // Session Check State
    const [hasUnclosedSession, setHasUnclosedSession] = useState(false);
    const [sessionCheckLoading, setSessionCheckLoading] = useState(true);

    // Pending Anomalies State
    const [pendingAnomalies, setPendingAnomalies] = useState<Anomaly[]>([]);

    // Idle Timeout for Kiosk Security
    const [showIdleWarning, setShowIdleWarning] = useState(false);
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const IDLE_WARNING = 30 * 1000; // 30 seconds before logout

    // Menu State
    const [showMenu, setShowMenu] = useState(false);

    useIdleTimeout({
        timeoutMs: IDLE_TIMEOUT,
        onTimeout: () => {
            console.log('[Kiosk] Auto-logout due to inactivity');
            addToast('warning', 'Sessão encerrada por inatividade');
            onLogout();
        },
        warningTimeMs: IDLE_WARNING,
        onWarning: () => {
            console.log('[Kiosk] Idle warning');
            setShowIdleWarning(true);
            setTimeout(() => setShowIdleWarning(false), IDLE_WARNING);
        }
    });

    // Get today's schedule from Schedule Template
    const todaySchedule = useMemo(() => {
        if (!user.scheduleTemplateId || !scheduleTemplates || scheduleTemplates.length === 0) {
            return null;
        }

        const template = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);
        if (!template) return null;

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

        // Check if template has weeklyPattern
        if (template.weeklyPattern && template.weeklyPattern.length > 0) {
            const daySchedule = template.weeklyPattern.find(d => d.day === dayOfWeek);
            if (daySchedule && !daySchedule.isOff) {
                return {
                    start: daySchedule.start,
                    end: daySchedule.end,
                    breakStart: daySchedule.breakStart,
                    breakEnd: daySchedule.breakEnd
                };
            }
        }

        // Check if template has cyclePattern (rotating shifts)
        if (template.cyclePattern && template.cycleDays && user.scheduleCycleStartDate) {
            const cycleStart = new Date(user.scheduleCycleStartDate);
            const daysSinceStart = Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
            const cycleDay = (daysSinceStart % template.cycleDays) + 1; // 1-based

            const daySchedule = template.cyclePattern.find(d => d.dayIndex === cycleDay);
            if (daySchedule && !daySchedule.isOff) {
                return {
                    start: daySchedule.start,
                    end: daySchedule.end,
                    breakStart: daySchedule.breakStart,
                    breakEnd: daySchedule.breakEnd
                };
            }
        }

        return null;
    }, [user.scheduleTemplateId, user.scheduleCycleStartDate, scheduleTemplates]);

    // Hour Bank Balance Calculation
    const hourBankBalance = useMemo(() => {
        const timeToMinutes = (time: string | undefined) => {
            if (!time) return 0;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };
        const userLogs = timeLogs.filter(l => l.userId === user.id);
        let expectedMinutesPerDay = 8 * 60;
        if (user.workStartTime && user.workEndTime) {
            const startMins = timeToMinutes(user.workStartTime);
            const endMins = timeToMinutes(user.workEndTime);
            let rawDiff = endMins - startMins;
            if (rawDiff > 5 * 60) rawDiff -= 60;
            expectedMinutesPerDay = rawDiff;
        }
        let runningBalance = 0;
        userLogs.forEach(log => {
            let workedMinutes = 0;
            if (log.totalHours && log.totalHours > 0) {
                workedMinutes = Math.round(log.totalHours * 60);
            } else if (log.checkIn && log.checkOut) {
                // Recalculate on the fly if missing/zero but times are present
                const inMins = timeToMinutes(log.checkIn);
                let outMins = timeToMinutes(log.checkOut);

                // Handle overnight shifts
                if (outMins < inMins) outMins += 24 * 60;

                let rawDiff = outMins - inMins;

                // Subtract break if present
                if (log.breakStart && log.breakEnd) {
                    const bIn = timeToMinutes(log.breakStart);
                    let bOut = timeToMinutes(log.breakEnd);
                    if (bOut < bIn) bOut += 24 * 60;
                    const bDiff = bOut - bIn;
                    if (bDiff > 0 && bDiff < rawDiff) rawDiff -= bDiff;
                }
                workedMinutes = rawDiff;
            }

            if (workedMinutes > 0) {
                runningBalance += workedMinutes - expectedMinutesPerDay;
            }
        });
        const adjTotal = hourBankAdjustments.filter(a => a.userId === user.id).reduce((sum, a) => sum + a.adjustmentMinutes, 0);
        return runningBalance + adjTotal;
    }, [timeLogs, hourBankAdjustments, user]);

    // Vacation Balance
    const vacationBalance = useMemo(() => {
        return calculateVacationBalance(user, leaves, user.id, leaveTypes, scheduleTemplates);
    }, [user, leaves, leaveTypes, scheduleTemplates]);

    // Filtered vehicles with robust matching
    const filteredVehicles = vehicles.filter(v => {
        // Robust status check (handle case sensitivity)
        const status = (v.status || '').toUpperCase();
        if (status !== 'AVAILABLE' && status !== 'DISPONIVEL') return false;

        // Normalize strings for comparison (remove spaces, dashes, etc)
        const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const search = normalize(searchQuery);
        const plate = normalize(v.plate);

        // Match ONLY by plate as requested user ("não procurar por id mas pela matricula")
        // We can keep model as secondary if needed, but let's prioritize plate behavior
        return plate.includes(search) || (searchQuery.length > 2 && v.model.toUpperCase().includes(searchQuery));
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 📋 REMOVIDO: Anomalias agora são carregadas no useEffect principal em paralelo
    // Para polling em tempo real, pode ser adicionado depois do carregamento inicial

    // ⚡ OTIMIZADO: Mostrar botões IMEDIATAMENTE, carregar dados em background
    useEffect(() => {
        // PRIORIDADE 1: Desbloquear UI instantaneamente
        setSessionCheckLoading(false);

        const loadAllData = async () => {
            const startTime = Date.now();
            console.log('[Kiosk] 🚀 Loading background data (non-blocking)...');

            try {
                // Helper function to add timeout to promises
                const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> => {
                    return Promise.race([
                        promise,
                        new Promise<T>((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                        )
                    ]).catch(() => defaultValue);
                };

                // ⚡ OTIMIZAÇÃO: Execute queries em PARALELO (não bloqueia UI)
                const [sessionResult, tripResult, anomaliesResult] = await Promise.all([
                    // 1. Session Check - TIMEOUT REDUZIDO 5s → 2s
                    withTimeout(
                        checkAndCloseOpenSessions(user.id),
                        2000,
                        { hasOpenSessions: false, closedSessions: 0, affectedUsers: [], errors: [] }
                    ).catch(err => {
                        console.error('Failed to check open sessions:', err);
                        return { hasOpenSessions: false, closedSessions: 0, affectedUsers: [], errors: [err] };
                    }),

                    // 2. Active Trip Check
                    withTimeout(
                        (async () => {
                            const result = await supabase
                                .from('trips')
                                .select(`
                                    *,
                                    vehicle:vehicles!trips_vehicle_id_fkey (*)
                                `)
                                .eq('user_id', user.id)
                                .is('end_date', null)
                                .maybeSingle();
                            return result;
                        })(),
                        2000,
                        { data: null, error: null, count: null, status: 200, statusText: 'OK' }
                    ).catch(err => {
                        console.error('Failed to fetch active trip:', err);
                        return { data: null, error: err, count: null, status: 500, statusText: 'Error' };
                    }),

                    // 3. Pending Anomalies - MOVIDO PARA O LOADING INICIAL
                    withTimeout(
                        (async () => {
                            const result = await supabase
                                .from('anomalies')
                                .select('*')
                                .eq('user_id', user.id)
                                .eq('status', 'AWAITING_JUSTIFICATION')
                                .order('created_at', { ascending: false });
                            return result;
                        })(),
                        2000,
                        { data: [], error: null, count: null, status: 200, statusText: 'OK' }
                    ).catch(err => {
                        console.error('Failed to fetch anomalies:', err);
                        return { data: [], error: err, count: null, status: 500, statusText: 'Error' };
                    })
                ]);

                const loadTime = Date.now() - startTime;
                console.log(`[Kiosk] ✅ Parallel load completed in ${loadTime}ms`);

                // ⚡ Process trip results IMMEDIATELY
                if (tripResult.data) {
                    const trip = tripResult.data;
                    let currentVehicle = trip.vehicle;

                    // Ensure trip has vehicle attached
                    setActiveTrip({ ...trip, vehicle: currentVehicle });
                    if (currentVehicle) {
                        setVehicle(currentVehicle);
                        setTripKm(currentVehicle.currentKm);
                    }
                    console.log('[Kiosk] Active trip loaded:', trip.id);
                }

                // ⚡ Process anomalies results IMMEDIATELY
                if (anomaliesResult.data && anomaliesResult.data.length > 0) {
                    console.log(`[Kiosk] 📋 Found ${anomaliesResult.data.length} pending anomalies`);
                    setPendingAnomalies(anomaliesResult.data as Anomaly[]);
                } else {
                    setPendingAnomalies([]);
                }

                // Process session results
                if (sessionResult.hasOpenSessions && sessionResult.closedSessions > 0) {
                    setHasUnclosedSession(true);

                    const affectedDates = sessionResult.affectedUsers
                        .filter(u => u.userId === user.id)
                        .map(u => new Date(u.date).toLocaleDateString('pt-PT'))
                        .join(', ');

                    if (affectedDates) {
                        addToast('warning',
                            `⚠️ Detetada(s) sessão(ões) não encerrada(s) dos dias: ${affectedDates}. ` +
                            `Foi(foram) automaticamente marcada(s) como anomalia por tempo limite de permanência aberta. ` +
                            `Por favor, contacte o RH ou o seu superior para corrigir.`,
                            10000
                        );
                    }
                }

                if (sessionResult.errors.length > 0) {
                    console.error('Errors during session check:', sessionResult.errors);
                }

            } catch (error) {
                console.error('Error loading background data:', error);
            }
        };

        // Carregar em background (não espera)
        loadAllData();
    }, [user.id]);

    // ⚡ OTIMIZADO: Carregar fleet data apenas se necessário (deep linking)
    useEffect(() => {
        const loadFleetData = async () => {
            // Check for deep linking (viatura parameter in URL)
            const query = new URLSearchParams(window.location.search);
            const vehicleIdParam = searchParams.get('viatura') || searchParams.get('vehicle') || query.get('viatura') || query.get('vehicle');

            if (vehicleIdParam) {
                console.log('[Kiosk] Deep link detected for vehicle:', vehicleIdParam);
                setIsDeepLinking(true);
                try {
                    const linkedVehicle = await fetchVehicleById(vehicleIdParam);
                    if (linkedVehicle) {
                        setVehicle(linkedVehicle);

                        // Fix potential KM bug by fetching last trip
                        const lastTrip = await fetchLastTrip(linkedVehicle.id);
                        let realKm = linkedVehicle.currentKm;
                        if (lastTrip && lastTrip.endKm && lastTrip.endKm > realKm) {
                            realKm = lastTrip.endKm;
                            setVehicle(prev => prev ? ({ ...prev, currentKm: realKm }) : null);
                        }

                        setTripKm(realKm);
                    }
                } catch (err) {
                    console.error('Deep link vehicle fetch failed:', err);
                }
            }
        };

        loadFleetData();
    }, [searchParams, user.id]);

    // ⚠️ REMOVIDO o código duplicado que carregava trip - já é carregado em PARALELO acima

    // ⚠️ REMOVIDO: useEffect duplicado que carregava trip/vehicles
    // Agora tudo é carregado em PARALELO no primeiro useEffect (loadAllData)

    // Function to load vehicles when needed
    const loadVehicles = () => {
        setIsLoading(true);
        setShowVehicleSearch(true);
        fetchVehicles()
            .then(data => setVehicles(data))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));

        fetchUserTopVehicles(user.id)
            .then(data => setSuggestedVehicles(data))
            .catch(err => console.error(err));
    };

    // Check Weekly Pulse Survey
    // Calculate online users (currently clocked in today)
    const onlineCount = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return timeLogs.filter(l => l.date === todayStr && !l.checkOut).length;
    }, [timeLogs]);

    // Duration timer for current sessionek
    useEffect(() => {
        const checkSurvey = async () => {
            // Monday of current week
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now.setDate(diff)).toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('survey_responses')
                .select('id')
                .eq('user_id', user.id)
                .eq('survey_type', 'WEEKLY_PULSE')
                .eq('reference_date', monday)
                .maybeSingle();

            if (!error && !data) {
                setSurveyCompletedThisWeek(false);
                setShowSurvey(true);
            } else {
                setSurveyCompletedThisWeek(true);
            }
        };
        checkSurvey();
    }, [user.id]);

    // DISABLED: Check for missing profile fields and show prompt (once per day per user)
    // useEffect(() => {
    //     // Check if ALL fields are properly filled
    //     const hasValidBirthDate = user.birthDate && user.birthDate !== '' && !user.birthDate.startsWith('1900');
    //     const hasValidPhone = user.mobilePhone && user.mobilePhone !== '';
    //     const hasValidEmergency = user.emergencyContact && user.emergencyContact !== '';
    //
    //     // If ALL fields are filled, don't show modal
    //     if (hasValidBirthDate && hasValidPhone && hasValidEmergency) return;
    //
    //     // Check if modal was dismissed today
    //     const dismissKey = `profile_completion_dismissed_${user.id}`;
    //     const lastDismissed = localStorage.getItem(dismissKey);
    //     const today = new Date().toISOString().split('T')[0];
    //
    //     if (lastDismissed === today) return;
    //
    //     // Show with a short delay so the page loads first
    //     const timer = setTimeout(() => setShowProfileCompletion(true), 2000);
    //     return () => clearTimeout(timer);
    // }, [user.id, user.birthDate, user.mobilePhone, user.emergencyContact]);

    // Determine working state based on last log (ignoring date to catch overnight shifts)
    const isWorking = lastLog && !lastLog.checkOut;

    useEffect(() => {
        console.log('[Kiosk] Debug Status:', {
            userId: user.id,
            isWorking,
            lastLogId: lastLog?.id,
            lastLogCheckIn: lastLog?.checkIn,
            lastLogCheckOut: lastLog?.checkOut,
            timeLogsCount: timeLogs.length
        });
    }, [user.id, isWorking, lastLog, timeLogs]);

    // Calculate duration if working
    const getDuration = () => {
        if (!isWorking || !lastLog?.checkIn) return null;
        const [h, m] = lastLog.checkIn.split(':').map(Number);

        // CORREÇÃO CRÍTICA: Usar a mesma data base para ambos os timestamps
        const now = new Date(currentTime);
        const start = new Date(currentTime); // Usa a MESMA data base
        start.setHours(h, m, 0, 0);

        // Se a hora de entrada for depois da hora atual (ex: entrada às 23h, agora é 1h)
        // significa que cruzamos a meia-noite
        if (start > now) {
            start.setDate(start.getDate() - 1); // Ajusta para o dia anterior
        }

        const diff = now.getTime() - start.getTime();

        // Proteção contra valores negativos (não deveria acontecer com a correção acima)
        if (diff < 0) {
            console.error('[KioskDashboard] ERRO: Tempo de trabalho negativo detectado!', {
                checkIn: lastLog.checkIn,
                currentTime: now.toISOString(),
                startTime: start.toISOString(),
                diff
            });
            return '0h 0m'; // Fallback seguro
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const duration = getDuration();

    // Helper to get location
    const getLocation = (): Promise<string | undefined> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(undefined);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
                (err) => {
                    console.error('Geo error', err);
                    resolve(undefined);
                }
            );
        });
    };

    // Trip handlers
    const handleVehicleSelect = async (v: Vehicle) => {
        // Optimistic UI set
        setVehicle(v);
        setShowVehicleSearch(false);

        // Fetch "Real" Last Trip details to correct potential 0KM bug
        const lastTrip = await fetchLastTrip(v.id);

        let realKm = v.currentKm;
        if (lastTrip && lastTrip.endKm && lastTrip.endKm > realKm) {

            realKm = lastTrip.endKm;
            // Update the local vehicle object state so the UI reflects the real KM
            setVehicle(prev => prev ? ({ ...prev, currentKm: realKm }) : null);
        }

        setTripKm(realKm);
        setShowTripModal(true);
    };

    const handleStartTrip = async () => {
        if (!vehicle || isSubmitting) return;

        // CRITICAL GUARD: Never allow starting if active trip exists
        if (activeTrip) {
            addToast('error', 'Já existe uma viagem em curso! Finalize-a antes de iniciar outra.');
            return;
        }

        setIsSubmitting(true);



        // Senior Fleet Manager Rule: Compliance Check (Inspection & Insurance)
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        if (vehicle.nextInspection) {
            const inspectionDate = new Date(vehicle.nextInspection);
            if (inspectionDate < today) {
                addToast('error', '⛔ VIATURA COM INSPEÇÃO EXPIRADA! Não é permitido iniciar viagem.');
                return;
            }
            if (inspectionDate < thirtyDaysFromNow) {
                addToast('warning', `⚠️ Atenção: A inspeção expira em breve (${vehicle.nextInspection}).`);
            }
        }

        if (vehicle.insuranceExpiry) {
            const insuranceDate = new Date(vehicle.insuranceExpiry);
            if (insuranceDate < today) {
                addToast('error', '⛔ VIATURA COM SEGURO EXPIRADO! Não é permitido iniciar viagem.');
                return;
            }
            if (insuranceDate < thirtyDaysFromNow) {
                addToast('warning', `⚠️ Atenção: O seguro expira em breve (${vehicle.insuranceExpiry}).`);
            }
        }

        // Senior Fleet Manager Rule: Odometer cannot go backwards
        if (tripKm < vehicle.currentKm) {
            addToast('error', `A quilometragem não pode ser inferior ao registo atual da viatura (${vehicle.currentKm} km).`);
            return;
        }

        try {
            const location = await getLocation();
            const trip = await startTrip(vehicle.id, user.id, tripKm, undefined, tripDestination || undefined, location);
            if (trip) {
                setActiveTrip({ ...trip, vehicle: vehicle });
                setShowTripModal(false);
                setTripDestination('');
                addToast('success', 'Viagem iniciada com sucesso. Boa viagem!');
            } else {
                addToast('error', 'Erro ao iniciar viagem. Tente novamente.');
            }
        } catch (err) {
            console.error(err);
            addToast('error', 'Erro de sistema ao iniciar viagem.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEndTrip = async () => {
        if (!activeTrip || isSubmitting) return;

        setIsSubmitting(true);



        // Senior Fleet Manager Rule: Odometer cannot go backwards
        if (tripKm < activeTrip.startKm) {
            addToast('error', `A quilometragem final (${tripKm}) não pode ser inferior à inicial (${activeTrip.startKm}).`);
            return;
        }

        // Optional: Senior Manager Sanity Check (Warning for excessive KMs, e.g., > 2000km in one trip? Maybe later)

        try {
            const location = await getLocation();
            const trip = await endTrip(activeTrip.id, tripKm, location);
            if (trip) {
                setActiveTrip(null);
                setVehicle(null);
                setShowTripModal(false);
                addToast('success', 'Viagem finalizada. Obrigado!');

                // Refresh fleet data to ensure odometer is updated in the list
                fetchVehicles().then(data => setVehicles(data));
            } else {
                addToast('error', 'Erro ao finalizar viagem.');
            }
        } catch (err) {
            console.error(err);
            addToast('error', 'Erro de sistema ao finalizar viagem.');
        } finally {
            setIsSubmitting(false);
        }
    };


    // We no longer block the UI while checking sessions.
    // The interface is shown immediately with skeleton states where data is pending.

    return (
        <div className="min-h-screen bg-[#0B2147] text-white flex flex-col font-sans relative overflow-hidden">
            {/* Header */}

            {/* Header */}
            <div className="p-4 md:px-12 md:py-4 flex justify-between items-center">
                {/* Left: Menu Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="relative p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 backdrop-blur-md transition-colors duration-50 group  shadow-lg"
                        title="Menu"
                    >
                        <Menu className="text-blue-200 group-hover:text-white transition-colors" size={24} />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowMenu(false)}
                            />

                            {/* Menu Panel */}
                            <div className="absolute top-full left-0 mt-2 w-72 bg-[#1a2f5a] rounded-xl shadow-2xl border border-white/20 backdrop-blur-xl z-50 overflow-hidden">
                                <div className="p-2">
                                    {/* User Info */}
                                    <div className="px-4 py-3 bg-white/5 rounded-lg mb-2 border border-white/10">
                                        <p className="text-white font-bold text-sm">{user.name}</p>
                                        <p className="text-blue-200 text-xs">ID: {user.id}</p>
                                    </div>

                                    {/* Menu Items */}
                                    <button
                                        onClick={() => {
                                            navigate('/portal/profile');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors duration-50 group"
                                    >
                                        <Settings size={18} className="text-blue-300 group-hover:text-white" />
                                        <span className="text-sm font-medium">Perfil</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigate('/portal/attendance');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors duration-50 group"
                                    >
                                        <Clock size={18} className="text-blue-300 group-hover:text-white" />
                                        <span className="text-sm font-medium">Assiduidade</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigate('/portal/vacations');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors duration-50 group"
                                    >
                                        <TreePalm size={18} className="text-blue-300 group-hover:text-white" />
                                        <span className="text-sm font-medium">Férias</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigate('/portal/expenses');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors duration-50 group"
                                    >
                                        <CreditCard size={18} className="text-blue-300 group-hover:text-white" />
                                        <span className="text-sm font-medium">Despesas</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigate('/portal/messages');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors duration-50 group"
                                    >
                                        <MessageSquare size={18} className="text-blue-300 group-hover:text-white" />
                                        <span className="text-sm font-medium">Mensagens</span>
                                        {messages.some(m => m.receiverId === user.id && !m.read) && (
                                            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {messages.filter(m => m.receiverId === user.id && !m.read).length}
                                            </span>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigate('/portal/fleet');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors duration-50 group"
                                    >
                                        <Car size={18} className="text-blue-300 group-hover:text-white" />
                                        <span className="text-sm font-medium">Frota</span>
                                    </button>

                                    {/* Divider */}
                                    <div className="my-2 border-t border-white/10"></div>

                                    {/* Logout */}
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onLogout();
                                            setTimeout(() => {
                                                window.location.hash = '/login';
                                            }, 100);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-500/20 rounded-lg transition-colors duration-50 group"
                                    >
                                        <LogOut size={18} className="text-red-300 group-hover:text-red-200" />
                                        <span className="text-sm font-medium">Sair</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right side - Messages notification + Logout */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Messages Button with notification badge */}
                    {messages.some(m => m.receiverId === user.id && !m.read) && (
                        <button
                            onClick={() => navigate('/portal/messages')}
                            className="relative p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 backdrop-blur-md transition-colors duration-50 group  shadow-lg"
                            title="Mensagens"
                        >
                            <MessageSquare className="text-blue-400 group-hover:text-blue-300 transition-colors" size={20} />
                            {(() => {
                                const unreadCount = messages.filter(m => m.receiverId === user.id && !m.read).length;
                                return unreadCount > 0 ? (
                                    <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full border-2 border-[#0B2147] flex items-center justify-center">
                                        <span className="text-white text-[10px] font-bold leading-none">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                    </div>
                                ) : null;
                            })()}
                        </button>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={() => {
                            onLogout();
                            setTimeout(() => {
                                window.location.hash = '/login';
                            }, 100);
                        }}
                        className="p-2.5 md:p-3 bg-white/5 hover:bg-red-500/20 rounded-xl border border-white/10 hover:border-red-400/30 backdrop-blur-md transition-colors duration-50 group  shadow-lg"
                        title="Sair"
                    >
                        <LogOut className="text-red-300 group-hover:text-red-200 transition-colors" size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-6 pt-2 md:pt-2 space-y-6 md:space-y-10 max-w-2xl mx-auto w-full">

                {/* IDLE WARNING BANNER */}
                {showIdleWarning && (
                    <div className="w-full bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 md:p-5 backdrop-blur-md animate-pulse shadow-2xl border-2 border-white/20">
                        <div className="flex items-center gap-4 text-white">
                            <div className="flex-shrink-0">
                                <Clock className="animate-spin" size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg mb-1">⚠️ Sessão Expira em Breve</h3>
                                <p className="text-sm opacity-90">
                                    Sem atividade há algum tempo. A sessão será encerrada automaticamente em 30 segundos.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📋 PENDING JUSTIFICATIONS BANNER */}
                {pendingAnomalies.length > 0 && (
                    <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-2xl border-2 border-white/30 animate-pulse">
                        <div className="flex items-center gap-4 text-white">
                            <div className="flex-shrink-0 bg-white/20 rounded-full p-3">
                                <AlertTriangle className="animate-bounce" size={28} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                                    📋 Justificações Pendentes
                                    <span className="px-2 py-0.5 bg-white/30 rounded-full text-sm font-bold">
                                        {pendingAnomalies.length}
                                    </span>
                                </h3>
                                <p className="text-sm opacity-95 mb-2">
                                    O seu responsável solicitou justificação para {pendingAnomalies.length === 1 ? 'uma ausência' : `${pendingAnomalies.length} ausências`}.
                                </p>
                                <button
                                    onClick={() => navigate('/portal/profile?tab=onboarding')}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors duration-50 shadow-lg"
                                >
                                    <MessageSquare size={16} />
                                    Ver e Justificar
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DEEP LINK LOADING OVERLAY */}
                {isDeepLinking && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-4">
                        <div className="animate-spin text-blue-500 mb-4 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        <p className="text-white font-bold text-xl animate-pulse">A preparar viatura...</p>
                    </div>
                )}

                <div className="text-center w-full">
                    <div className="relative inline-block mb-4 md:mb-6">
                        {sessionCheckLoading ? (
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-blue-500/20 bg-blue-500/10 animate-pulse flex items-center justify-center">
                                <UserIcon size={48} className="text-blue-500/20" />
                            </div>
                        ) : (
                            <img
                                src={user.photoUrl}
                                alt={user.name}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#3b82f6] shadow-[0_0_30px_rgba(59,130,246,0.5)] object-cover"
                            />
                        )}
                        {/* Status Indicator overlapping photo */}
                        {!sessionCheckLoading && isWorking && (
                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#1e3a5f] rounded-full border-2 border-green-500 shadow-lg z-20 flex items-center justify-center backdrop-blur-sm">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                        )}
                    </div>
                    {sessionCheckLoading ? (
                        <div className="h-8 w-48 bg-blue-500/10 rounded-lg animate-pulse mx-auto mb-2"></div>
                    ) : (
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">{user.name}</h1>
                    )}

                    {isWorking && lastLog?.checkIn && (
                        <div className="flex flex-col items-center gap-2 mt-1">
                            {duration && (
                                <div className="text-emerald-400 text-sm md:text-lg font-bold bg-emerald-900/20 px-5 py-2 rounded-lg inline-block border border-emerald-500/30">
                                    <Clock size={16} className="inline mr-2" />
                                    {duration} trabalhadas
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Last Record Info - Simplified in Driving Mode */}
                {!activeTrip && (
                    <div className="bg-[#162d4b] w-full rounded-2xl p-4 md:p-6 border border-white/5 shadow-lg relative overflow-hidden">
                        {sessionCheckLoading && (
                            <div className="absolute inset-0 bg-[#162d4b] z-10 flex flex-col items-center justify-center p-6 animate-pulse">
                                <div className="h-3 w-24 bg-white/5 rounded mb-4"></div>
                                <div className="h-6 w-48 bg-white/10 rounded mb-4"></div>
                                <div className="flex gap-2">
                                    <div className="h-6 w-20 bg-white/5 rounded"></div>
                                    <div className="h-6 w-20 bg-white/5 rounded"></div>
                                </div>
                            </div>
                        )}
                        <div className="text-center mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Último Registo</div>
                        <div className="flex flex-col items-center">
                            {!lastLog ? (
                                <div className="text-base text-gray-400 italic py-2">Sem registos recentes</div>
                            ) : (
                                <div className="text-base md:text-lg">
                                    {isWorking ? (
                                        <span className="text-emerald-400 font-bold">Entrada</span>
                                    ) : (
                                        <span className="text-gray-300">Saída</span>
                                    )}
                                    <span className="text-white mx-1">
                                        {lastLog.date === new Date().toISOString().split('T')[0] ? 'hoje às' : `em ${new Date(lastLog.date).toLocaleDateString('pt-PT')} às`}
                                    </span>
                                    <span className="font-mono font-bold">{isWorking ? lastLog.checkIn : (lastLog.checkOut || '--:--')}</span>
                                </div>
                            )}

                            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-3">
                                {user.attendanceConfig?.restriction !== 'NONE' && (
                                    <div className="bg-[#0B2147] px-3 py-1 rounded text-xs text-gray-400 flex items-center gap-1.5 border border-white/5">
                                        <MapPin size={12} /> {lastLog?.checkInLocation || 'GPS'}
                                    </div>
                                )}
                                <div className="bg-[#0B2147] px-3 py-1 rounded text-xs text-gray-400 flex items-center gap-1.5 border border-white/5">
                                    <Globe size={12} /> {user.department || 'Geral'}
                                </div>
                            </div>

                            {/* Work Schedule Display - ALWAYS SHOW */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="text-center">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Horário de Trabalho
                                    </div>
                                    {todaySchedule ? (
                                        <>
                                            <div className="flex items-center justify-center gap-2">
                                                <Clock size={14} className="text-blue-400" />
                                                <span className="font-mono text-sm font-bold text-white">
                                                    {todaySchedule.start}
                                                </span>
                                                <span className="text-gray-400 text-xs">às</span>
                                                <span className="font-mono text-sm font-bold text-white">
                                                    {todaySchedule.end}
                                                </span>
                                            </div>
                                            {todaySchedule.breakStart && todaySchedule.breakEnd && (
                                                <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-400">
                                                    <Coffee size={12} />
                                                    <span>Pausa: {todaySchedule.breakStart} - {todaySchedule.breakEnd}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-xs text-gray-500 italic">
                                            Sem horário definido
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PULSE SURVEY WIDGET */}
                {showSurvey && !surveyCompletedThisWeek && (
                    <PulseSurveyWidget user={user} onSuccess={() => setShowSurvey(false)} />
                )}

                {/* VISUAL HIERARCHY SWITCH */}
                {activeTrip && vehicle ? (
                    /* ================= DRIVING MODE ================= */
                    <div className="w-full flex-1 flex flex-col justify-center animate-fade-in-up">

                        {/* Hero Card */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden mb-6">

                            {/* Animated Background Pulse */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>

                            {/* Status Header */}
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="bg-green-100 px-5 py-2 rounded-full flex items-center gap-3 border border-green-200 shadow-sm">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-green-500 rounded-full relative z-10"></div>
                                        <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0 left-0 animate-ping"></div>
                                    </div>
                                    <span className="text-sm font-black text-green-700 uppercase tracking-widest">EM VIAGEM</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Início</p>
                                    <p className="font-mono font-bold text-gray-900 text-lg">
                                        {new Date(activeTrip.startDate).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Vehicle Display (Huge) */}
                            <div className="text-center mb-10 relative z-10">
                                <div className="inline-block p-6 rounded-3xl bg-gray-50 mb-4 shadow-inner">
                                    <Car size={48} className="text-blue-600" />
                                </div>
                                <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">{vehicle.plate}</h2>
                                <p className="text-xl font-medium text-gray-500">{vehicle.brand} {vehicle.model}</p>
                            </div>

                            {/* Primary Action: END TRIP */}
                            <button
                                onClick={() => setShowTripModal(true)}
                                className="w-full bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded-2xl py-6 font-bold text-xl flex items-center justify-center gap-3 shadow-xl shadow-red-500/20 transition-colors duration-50 active:scale-95 group relative overflow-hidden"
                            >
                                <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                                <CheckCircle2 size={28} />
                                <span className="relative">FINALIZAR VIAGEM</span>
                            </button>

                            {/* Secondary Action: EXPENSE */}
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="w-full mt-4 bg-white hover:bg-gray-50 text-gray-600 border-2 border-gray-100 hover:border-blue-200 rounded-2xl py-4 font-bold text-lg flex items-center justify-center gap-2 transition-colors duration-50 active:scale-95"
                            >
                                <ReceiptEuro size={24} className="text-blue-500" />
                                Registar Despesa
                            </button>
                        </div>

                        {/* Trip Context (Start KM) */}
                        <div className="bg-[#162d4b] rounded-2xl p-4 flex justify-between items-center border border-white/5">
                            <div className="flex items-center gap-3 text-gray-400">
                                <LogOut size={20} className="rotate-180" />
                                <span className="text-sm font-bold uppercase">Km Inicial</span>
                            </div>
                            <span className="font-mono text-xl font-bold text-white">{activeTrip.startKm} km</span>
                        </div>
                    </div>

                ) : (
                    /* ================= STANDARD MODE ================= */
                    <>
                        {/* Large Actions - Grid changes based on state */}
                        <div className="grid grid-cols-1 gap-4 md:gap-6 w-full">
                            {!isWorking ? (
                                <ClockButton
                                    type="in"
                                    onPress={async () => {
                                        if (isSubmitting) return;
                                        setIsSubmitting(true);
                                        try {
                                            await onClockIn(user);
                                            // Brief delay for visual feedback
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                            // CORREÇÃO: NÃO fazer logout - utilizador fica no portal
                                            // Toast removed to avoid duplication with ResilientKioskWrapper
                                        } catch (e) {
                                            console.error('[Kiosk] Clock-in error:', e);
                                            addToast('error', 'Erro ao registar entrada. Tente novamente.');
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting || sessionCheckLoading || !dataReady}
                                    isLoading={isSubmitting || sessionCheckLoading || !dataReady}
                                />
                            ) : (
                                // SAÍDA - Novo ClockButton otimizado
                                <ClockButton
                                    type="out"
                                    onPress={async () => {
                                        if (isSubmitting) return;
                                        setIsSubmitting(true);
                                        try {
                                            await onClockOut(user);
                                            // Brief delay for visual feedback
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                            // CORREÇÃO: NÃO fazer logout - utilizador fica no portal
                                            addToast('success', 'Saída registada com sucesso!');
                                        } catch (e) {
                                            console.error('[Kiosk] Clock-out error:', e);
                                            addToast('error', 'Erro ao registar saída. Tente novamente.');
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    disabled={isSubmitting || sessionCheckLoading || !dataReady}
                                    isLoading={isSubmitting || sessionCheckLoading || !dataReady}
                                />
                            )}
                        </div>

                        {/* FLEET WIDGET */}
                        <div className="w-full">
                            <FleetWidget onStartTrip={loadVehicles} />
                        </div>
                    </>
                )
                }

                {/* TODAY COMPANY DASHBOARD - REMOVED PER USER REQUEST */}
                {/* {!activeTrip && (
                    <TodayCompanyDashboard className="mb-6" />
                )} */}

                {/* VEHICLE SEARCH MODAL */}
                {
                    showVehicleSearch && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-md h-[85vh] flex flex-col overflow-hidden shadow-2xl relative animate-zoom-in">
                                <div className="p-8 pb-2">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Selecionar Viatura</h2>
                                        <button onClick={() => setShowVehicleSearch(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                                            <X size={20} className="text-gray-600" />
                                        </button>
                                    </div>

                                    <div className="relative mb-2">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <Search size={22} className="text-blue-500" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-14 pr-4 py-5 border-2 border-blue-100 hover:border-blue-300 focus:border-blue-500 rounded-2xl bg-blue-50/30 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 transition-colors duration-50 font-bold text-lg uppercase tracking-wider"
                                            placeholder="MATRÍCULA..."
                                            autoFocus
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3">
                                    {isLoading ? (
                                        <div className="text-center py-20 opacity-50">
                                            <div className="animate-spin text-blue-500 mb-4 mx-auto w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                                            <p className="text-sm font-bold text-gray-400">A carregar frota...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* SUGGESTIONS SECTION - Only show if no search query */}
                                            {searchQuery === '' && suggestedVehicles.length > 0 && (
                                                <div className="mb-6">
                                                    <div className="flex items-center gap-2 mb-3 pl-1">
                                                        <div className="w-1 h-4 bg-yellow-400 rounded-full"></div>
                                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mais Usados por Si</h3>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {suggestedVehicles.map(v => {
                                                            const isAvailable = vehicles.find(fleetV => fleetV.id === v.id)?.status === 'AVAILABLE' || vehicles.find(fleetV => fleetV.id === v.id)?.status === 'DISPONIVEL';

                                                            // Sync suggestion with latest fleet state (km, status)
                                                            const freshV = vehicles.find(fleetV => fleetV.id === v.id) || v;

                                                            if (!isAvailable) return null; // Don't show if currently taken

                                                            return (
                                                                <button
                                                                    key={`sugg-${freshV.id}`}
                                                                    onClick={() => handleVehicleSelect(freshV)}
                                                                    className="w-full bg-blue-50/50 border-2 border-yellow-100 hover:border-yellow-400 hover:bg-yellow-50/30 p-5 rounded-2xl transition-colors duration-50 flex items-center justify-between group text-left shadow-sm"
                                                                >
                                                                    <div>
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <span className="text-2xl font-bold text-gray-900 tracking-tight">{freshV.plate}</span>
                                                                            <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">FREQUENTE</span>
                                                                        </div>
                                                                        <p className="text-sm text-gray-500 font-medium">{freshV.brand} {freshV.model}</p>
                                                                    </div>
                                                                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600">
                                                                        <ChevronRight size={20} />
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-8 mb-3 pl-1">
                                                        <div className="w-1 h-4 bg-gray-300 rounded-full"></div>
                                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Toda a Frota</h3>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ALL VEHICLES LIST */}
                                            {filteredVehicles.length > 0 ? (
                                                filteredVehicles.map(v => (
                                                    <button
                                                        key={v.id}
                                                        onClick={() => handleVehicleSelect(v)}
                                                        className="w-full bg-white border-2 border-gray-50 hover:border-blue-500 hover:bg-blue-50/30 p-5 rounded-2xl transition-colors duration-50 flex items-center justify-between group text-left shadow-sm hover:shadow-lg hover:shadow-blue-500/10"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">{v.plate}</span>
                                                                {v.currentKm < 1000 && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">NOVO</span>}
                                                            </div>
                                                            <p className="text-sm text-gray-500 font-medium group-hover:text-blue-400">{v.brand} {v.model}</p>
                                                        </div>
                                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-50 text-gray-400">
                                                            <ChevronRight size={20} />
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-20">
                                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <Search size={32} className="text-gray-300" />
                                                    </div>
                                                    <p className="text-gray-900 font-bold text-xl mb-2">Viatura não encontrada</p>
                                                    <p className="text-gray-500">Tente outra matrícula.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* TRIP CONFIRMATION MODAL (Matching Image 1 & 3 "White Card") */}
                {
                    showTripModal && vehicle && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-zoom-in">

                                {/* Header */}
                                <div className="p-8 pb-0 text-center">
                                    <h2 className="text-2xl font-black text-gray-900 mb-2">
                                        {activeTrip ? 'Terminar Viagem' : 'Iniciar Viagem'}
                                    </h2>
                                    <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{vehicle.plate}</span>
                                    </div>
                                </div>

                                <div className="p-8">

                                    {/* KM DISPLAY (Big Visual) */}
                                    <div className="text-center mb-8">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                            {activeTrip ? 'INSIRA OS KMS FINAIS' : 'CONFIRMAR KMS PAINEL'}
                                        </p>

                                        {activeTrip && (
                                            <button
                                                onClick={() => {
                                                    setShowTripModal(false);
                                                    setShowExpenseModal(true);
                                                }}
                                                className="mb-6 w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 border border-blue-100"
                                            >
                                                <ReceiptEuro size={18} /> REGISTAR DESPESA
                                            </button>
                                        )}

                                        <div className="relative inline-block">
                                            <span className={`text-6xl font-black tracking-tighter ${
                                                // Visual feedback if KM is lower than expected
                                                (!activeTrip && vehicle.currentKm > tripKm) || (activeTrip && activeTrip.startKm > tripKm)
                                                    ? 'text-red-500' : 'text-[#2563EB]'
                                                }`}>
                                                {tripKm.toLocaleString('pt-PT')}
                                            </span>
                                            <div className="h-1 w-full bg-blue-100 mt-2 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 w-1/2 mx-auto rounded-full"></div>
                                            </div>
                                        </div>

                                        {!activeTrip ? (
                                            <p className="text-xs text-gray-400 mt-4 font-medium">
                                                Anterior: <span className="text-gray-600 font-bold">{vehicle.currentKm.toLocaleString('pt-PT')}</span> km
                                                {(tripKm > vehicle.currentKm) && (
                                                    <span className="ml-2 text-green-500 font-bold">
                                                        (+{tripKm - vehicle.currentKm} km)
                                                    </span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-400 mt-4 font-medium">
                                                Início: <span className="text-gray-600 font-bold">{activeTrip.startKm}</span> km
                                                {(tripKm > activeTrip.startKm) && (
                                                    <span className="ml-2 text-green-500 font-bold">
                                                        (Distância: {tripKm - activeTrip.startKm} km)
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>

                                    {/* NUMPAD (Improved Logic) */}
                                    <div className="grid grid-cols-3 gap-3 mb-8 px-4">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => {
                                                    // If value is exactly the start/current KM (initial state), replace it.
                                                    // Otherwise append.
                                                    const baseKm = activeTrip ? activeTrip.startKm : (vehicle ? vehicle.currentKm : 0);
                                                    if (tripKm === baseKm) {
                                                        setTripKm(num);
                                                    } else {
                                                        setTripKm(prev => Number(`${prev}${num}`));
                                                    }
                                                }}
                                                className="h-14 rounded-2xl text-2xl font-bold text-gray-700 hover:bg-gray-50 active:bg-blue-50 active:text-blue-600 transition-colors focus:outline-none"
                                            >
                                                {num}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                // Reset to base KM
                                                const baseKm = activeTrip ? activeTrip.startKm : (vehicle ? vehicle.currentKm : 0);
                                                setTripKm(baseKm);
                                            }}
                                            className="h-14 rounded-2xl text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 flex flex-col items-center justify-center leading-tight active:scale-95 transition-transform"
                                        >
                                            REPOR<br />INICIAL
                                        </button>
                                        <button
                                            onClick={() => {
                                                const baseKm = activeTrip ? activeTrip.startKm : (vehicle ? vehicle.currentKm : 0);
                                                if (tripKm === baseKm) {
                                                    setTripKm(0);
                                                } else {
                                                    setTripKm(prev => Number(`${prev}0`));
                                                }
                                            }}
                                            className="h-14 rounded-2xl text-2xl font-bold text-gray-700 hover:bg-gray-50 active:bg-blue-50 active:text-blue-600 transition-colors"
                                        >
                                            0
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Backspace logic
                                                const str = tripKm.toString();
                                                if (str.length <= 1) {
                                                    setTripKm(0);
                                                } else {
                                                    setTripKm(Number(str.slice(0, -1)));
                                                }
                                            }}
                                            className="h-14 rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95"
                                        >
                                            <LogOut className="rotate-180" size={24} />
                                        </button>
                                    </div>

                                    {/* Main Action Button */}
                                    <button
                                        onClick={activeTrip ? handleEndTrip : handleStartTrip}
                                        disabled={isSubmitting}
                                        className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-colors duration-50 active:scale-95 ${activeTrip
                                            ? 'bg-[#DC2626] hover:bg-[#b91c1c] text-white shadow-red-500/20'
                                            : 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-blue-500/20'
                                            } ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Please wait...
                                            </>
                                        ) : activeTrip ? (
                                            <><CheckCircle2 size={24} /> Confirmar Chegada</>
                                        ) : (
                                            <><CheckCircle2 size={24} /> Iniciar Agora</>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setShowTripModal(false)}
                                        className="w-full py-4 text-sm font-bold text-gray-400 hover:text-gray-600 mt-2"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* EXPENSE MODAL */}
                {
                    showExpenseModal && vehicle && (
                        <ExpenseModal
                            vehicle={vehicle}
                            user={user}
                            activeTrip={activeTrip || undefined}
                            onClose={() => {
                                setShowExpenseModal(false);
                                // If we were in a trip flow, reopen the trip modal
                                if (activeTrip) setShowTripModal(true);
                            }}
                            onSuccess={() => {
                                setShowExpenseModal(false);
                                addToast('success', 'Despesa registada com sucesso!');
                                // Reopen trip modal to finish the trip
                                if (activeTrip) setShowTripModal(true);
                            }}
                        />
                    )
                }

                {/* Profile Completion Modal */}
                {showProfileCompletion && (
                    <ProfileCompletionModal
                        user={user}
                        onComplete={() => setShowProfileCompletion(false)}
                        onDismiss={() => {
                            setShowProfileCompletion(false);
                            localStorage.setItem(`profile_completion_dismissed_${user.id}`, new Date().toISOString().split('T')[0]);
                        }}
                    />
                )}

                {/* LEO Assistant */}
                <LeoAssistant currentUser={user} context="kiosk" />

                <VehicleBookingModal
                    isOpen={showBookingModal}
                    onClose={() => setShowBookingModal(false)}
                    onSuccess={() => { }}
                    currentUser={user}
                    darkMode={true}
                />
            </div>
            {/* Collaborator Card Modal */}
            {showCardModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCardModal(false)}></div>
                    <div className="relative w-full max-w-2xl bg-gray-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowCardModal(false)}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-10 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <div className="p-4 md:p-8">
                            <CollaboratorCard user={user} className="hover:scale-100 shadow-none border border-white/5" />
                            <div className="mt-8 text-center">
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KioskDashboard;
