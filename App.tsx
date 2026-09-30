import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import './src/index.css';
import { isDemoMode } from './services/demoMode';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import CollaboratorLayout from './components/CollaboratorLayout';
import { ResilientKioskWrapper } from './components/ResilientKioskWrapper';
const LeoAssistant = lazy(() => import('./components/LeoAssistant'));

// PERFORMANCE: React Query for data caching and background sync
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';

import { ToastProvider, useToast } from './context/ToastContext';
import { DEFAULT_ONBOARDING_TASKS, DEFAULT_ATTENDANCE_CONFIG } from './constants';
import { User, Absence, AbsenceStatus, AbsenceStatusLabels, AbsenceType, TimeLog, Company, UserStatus, InternalMessage, TimeLogStatus, ToastMessage, ToastType, Expense, AppEvent, EventType, LockedMonth, JobRole, Holiday, Department, AnomalyType, Anomaly, Location, SchedulePeriod, ScheduleTemplate, LeaveType, Leave, LeaveStatus, LeaveStatusLabels, HourBankAdjustment, PersistentNotification, NotificationCategory, NotificationSeverity, NotificationActionType } from './types';
import { supabase } from './services/supabaseClient';
import { generateBio, generateWelcomeEmail } from './services/geminiService';
import { getEffectiveScheduleDay } from './utils/scheduleUtils';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types/auth';
import { wassengerService } from './services/wassengerService';
import { getSetting } from './services/settingsService';
import { historyService } from './services/historyService';
import { notificationService, CreateNotificationParams } from './services/notificationService';
import { analyticsService } from './services/analyticsService';
import { resilientTimeLogService } from './services/resilientTimeLogService';
import { resolveNumericUserId } from './services/idResolver';
const TeamStatus = lazy(() => import('./pages/TeamStatus'));

// CRITICAL: Login must NOT be lazy loaded - it's the entry point
import Login from './pages/Login';
const Rewards = lazy(() => import('./pages/Rewards'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const KioskDashboard = lazy(() => import('./pages/KioskDashboard'));
const EmployeeTimeBank = lazy(() => import('./pages/EmployeeTimeBank'));
const EmployeeAttendance = lazy(() => import('./pages/EmployeeAttendance'));
const EmployeeVacations = lazy(() => import('./pages/EmployeeVacations'));
const UserList = lazy(() => import('./pages/UserList'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const MyExpenses = lazy(() => import('./pages/MyExpenses'));
const ExpenseManagement = lazy(() => import('./pages/ExpenseManagement'));
const AbsenceManagement = lazy(() => import('./pages/AbsenceManagement'));
const AttendanceControl = lazy(() => import('./pages/AttendanceControl'));
const AuditorAccess = lazy(() => import('./pages/AuditorAccess'));
const Messages = lazy(() => import('./pages/Messages'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const FleetManagement = lazy(() => import('./pages/FleetManagement'));
const TripHistory = lazy(() => import('./pages/TripHistory'));
const MyVehicle = lazy(() => import('./pages/MyVehicle'));
const MonthlyTripReport = lazy(() => import('./pages/MonthlyTripReport'));
const LockMonth = lazy(() => import('./pages/LockMonth'));
const RolesManagement = lazy(() => import('./pages/RolesManagement'));
const HolidaysManagement = lazy(() => import('./pages/HolidaysManagement'));
const DepartmentsManagement = lazy(() => import('./pages/DepartmentsManagement'));
const AnomalyTypesManagement = lazy(() => import('./pages/AnomalyTypesManagement'));
const AnomalyDashboard = lazy(() => import('./pages/AnomalyDashboard'));
const ManualTimeEntry = lazy(() => import('./pages/ManualTimeEntry'));
const PayrollIntegration = lazy(() => import('./pages/PayrollIntegration'));
const PermissionsManagement = lazy(() => import('./pages/PermissionsManagement'));
const LocationsManagement = lazy(() => import('./pages/LocationsManagement'));
const SchedulePeriods = lazy(() => import('./pages/SchedulePeriods'));
const ScheduleTemplates = lazy(() => import('./pages/ScheduleTemplates'));
const LeaveTypesManagement = lazy(() => import('./pages/LeaveTypesManagement'));
const TeamCalendar = lazy(() => import('./pages/TeamCalendar'));
const RequestLeave = lazy(() => import('./pages/RequestLeave'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const OrganizationalClimate = lazy(() => import('./pages/OrganizationalClimate'));
const DocumentManagement = lazy(() => import('./pages/DocumentManagement'));
// const NotificationsPage = lazy(() => import('./pages/NotificationsPage')); // Removed notifications
const EmployeeFeedback = lazy(() => import('./pages/EmployeeFeedback'));
const FleetBooking = lazy(() => import('./pages/FleetBooking'));

// Loading Fallback Component
const PageLoader = () => {
  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowDebug(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
      <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
      {showDebug && (
        <div className="text-red-500 font-bold mt-4 text-center">
          <p>PageLoader is stuck!</p>
          <p className="text-sm text-gray-500">This usually means a lazy-loaded component failed to load, or the router is waiting for a Promise.</p>
        </div>
      )}
    </div>
  );
};

// Layout Wrapper for Admin to handle Sidebar Context
const AdminLayout = ({
  onLogout,
  currentUser,
  users,
  absences,
  expenses,
  messages,
  notifications,
  unreadNotifCount,
  leaves,
  surveyResponses,
  anonymousFeedbacks,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onUpdateLeave,
  analyticsContext,
  dataReady = true,
}: {
  onLogout: () => void,
  currentUser: User | null,
  users: User[],
  absences: Absence[],
  expenses: Expense[],
  messages: InternalMessage[],
  notifications: PersistentNotification[],
  unreadNotifCount: number,
  leaves: Leave[],
  surveyResponses: any[],
  anonymousFeedbacks: any[],
  onMarkNotificationRead: (id: number) => void,
  onMarkAllNotificationsRead: () => void,
  onUpdateLeave: (leave: Leave) => void,
  analyticsContext?: string,
  dataReady?: boolean,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={onLogout} />
      <main className="flex-1 md:ml-64 min-h-screen w-full">
        {!dataReady ? (
          <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
              <p className="text-sm text-gray-500 font-medium">A carregar dados...</p>
            </div>
          </div>
        ) : (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet context={{
                toggleSidebar: () => setSidebarOpen(prev => !prev),
                users,
                absences,
                expenses,
                messages,
                currentUser,
                notifications,
                unreadNotifCount,
                leaves,
                surveyResponses,
                anonymousFeedbacks,
                onMarkNotificationRead,
                onMarkAllNotificationsRead,
                onUpdateLeave,
              }} />
            </Suspense>
          </ErrorBoundary>
        )}
      </main>
      <Suspense fallback={null}>
        <LeoAssistant currentUser={currentUser} context="backoffice" analyticsContext={analyticsContext} />
      </Suspense>
    </div>
  );
};

function App() {
  const [users, setUsers] = useState<User[]>([]);
  // CRITICAL: Login and clock in/out MUST always work
  // Start with loading=false and show login immediately
  // Data will load in background
  const [loading, setLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [lockedMonths, setLockedMonths] = useState<LockedMonth[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [anomalyTypes, setAnomalyTypes] = useState<AnomalyType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedulePeriods, setSchedulePeriods] = useState<SchedulePeriod[]>([]);
  const [scheduleTemplates, setScheduleTemplates] = useState<ScheduleTemplate[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [hourBankAdjustments, setHourBankAdjustments] = useState<HourBankAdjustment[]>([]);
  const [notifications, setNotifications] = useState<PersistentNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Pulse Surveys & Anonymous Feedback
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);
  const [anonymousFeedbacks, setAnonymousFeedbacks] = useState<any[]>([]);

  // Automation State
  const [whatsappAutoAlerts, setWhatsappAutoAlerts] = useState(false);
  const alertsSentTodayRef = useRef<Set<string>>((() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const stored = localStorage.getItem(`wa_alerts_${todayStr}`);
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>();
  })());
  const [authMode, setAuthMode] = useState<'none' | 'admin' | 'employee'>('none');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { addToast } = useToast();
  const sentBirthdaysRef = useRef<Set<string>>(new Set());

  // Auth session key to trigger data reload on user change
  const [authSessionKey, setAuthSessionKey] = useState(0);

  // Listen for auth changes (login/logout) to reset or reload data
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Clear sensitive data on logout but KEEP users (needed for Login PIN flow)
        // and DON'T set loading=true (would cause permanent spinner on Login page)
        setAbsences([]);
        setTimeLogs([]);
        setExpenses([]);
        setMessages([]);
        setEvents([]);
        setLockedMonths([]);
        setJobRoles([]);
        setHolidays([]);
        setDepartments([]);
        setAnomalyTypes([]);
        setLocations([]);
        setSchedulePeriods([]);
        setScheduleTemplates([]);
        setLeaveTypes([]);
        setLeaves([]);
        setAnomalies([]);
        setHourBankAdjustments([]);
        setNotifications([]);
        setUnreadNotifCount(0);
        setSurveyResponses([]);
        setAnonymousFeedbacks([]);
        setCurrentUser(null);
        setDataReady(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Trigger data reload
        setAuthSessionKey(prev => prev + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync AuthContext user with App state (enables Phase 2 fetching and Leo)
  const { user: authUser, logout } = useAuth();
  const prevAuthUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (authUser) {
      try {
        const authUserId = Number(authUser.id);
        let targetProfile = users.find(u => Number(u.id) === authUserId);
        
        if (!targetProfile) {
          console.log('[App] User not found in users array - creating minimal profile for:', authUser.name);
          targetProfile = {
            id: authUserId,
            name: authUser.name,
            email: authUser.email || '',
            role: authUser.role,
            company: Company.SEMRUMO,
            status: UserStatus.ACTIVE,
            created_at: new Date().toISOString(),
            photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name || 'user')}&background=random`,
            attendanceConfig: DEFAULT_ATTENDANCE_CONFIG,
            workStartTime: '09:00',
            workEndTime: '18:00',
            iban: '',
            nif: '',
            cc: '',
            address: '',
            birthDate: '',
            admissionDate: new Date().toISOString().split('T')[0],
            phone: '',
            lunchStartTime: '13:00',
            lunchEndTime: '14:00',
            vacationDaysYearly: 0,
            vacationDaysCarryover: 0,
            vacationAdjustments: 0,
            onboardingTasks: DEFAULT_ONBOARDING_TASKS,
            documents: [],
            department: '',
            niss: '',
            nationality: '',
            mobilePhone: '',
            whatsappEnabled: false,
            locationIds: []
          };
        }
        
        console.log('[App] Setting currentUser successfully to:', targetProfile.name);
        setCurrentUser(targetProfile);

        // CRITICAL FIX: Only trigger reload if user actually changed (prevents infinite loop)
        if (prevAuthUserIdRef.current !== authUserId) {
          console.log('[App] User changed, triggering data reload:', authUserId);
          prevAuthUserIdRef.current = authUserId;
          setAuthSessionKey(prev => prev + 1);
        }
      } catch (err) {
        console.error('[App] ERROR in user sync useEffect:', err);
      }
    } else {
      console.log('[App] authUser is falsy, setting currentUser to null');
      setCurrentUser(null);
      prevAuthUserIdRef.current = null;
    }
  }, [authUser, users]);

  // Helper to compare times (HH:MM)
  const getMinutesFromTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to normalize status (Fix for legacy/inconsistent data)
  const normalizeLeaveStatus = (status: string): LeaveStatus => {
    if (!status) return 'PENDING';
    const s = status.toUpperCase();
    // Handle both uppercase and lowercase from database
    if (s === 'PENDING' || s === 'PENDENTE') return 'PENDING';
    if (s === 'APPROVED' || s === 'APROVADO') return 'APPROVED';
    if (s === 'REJECTED' || s === 'REJEITADO') return 'REJECTED';
    // Default fallback
    return 'PENDING';
  };

  // Initial Data Load — Phase 1: Users, Phase 2: Everything else (background)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // PERFORMANCE & SCALABILITY FIX:
        // When user is not logged in (e.g. at /login), DO NOT query users or private data.
        // The Login page operates independently with direct single-user PIN verification.
        if (!authUser) {
          setLoading(false);
          setDataReady(true);
          return;
        }

        console.log('[App] Starting data fetch for authenticated user:', authUser.name);
        setLoading(true);
        setDataReady(false);

        // Ensure all time logs of the current month and recent months are loaded (90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const dateFilter = ninetyDaysAgo.toISOString().split('T')[0];

        // === PHASE 1: Load Users from Supabase ===
        // OPTIMIZATION: Select only essential fields for faster initial load
        // Full user data will be loaded in background after login is enabled
        let currentUsersList: any[] = [];
        
        if (isDemoMode()) {
          console.log('[App] 🟢 Demo Mode Active - Using mocked users');
          const { getDemoUsers } = await import('./services/demoMode');
          currentUsersList = getDemoUsers().map(u => ({
             ...u,
             status: 'ACTIVE',
             photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
             attendanceConfig: DEFAULT_ATTENDANCE_CONFIG,
             created_at: new Date().toISOString(),
          })) as any[];
          setUsers(currentUsersList);
        } else {
          const usersRes = await supabase
            .from('users')
            .select('id, name, role, email, status, company, department, work_start_time, work_end_time, photo_url, attendance_config')
            .eq('status', 'ACTIVE')
            .order('id', { ascending: true });

          if (usersRes.data && usersRes.data.length > 0) {
            const freshMappedUsers: User[] = usersRes.data.map((u: any) => ({
              // Essential fields (loaded from DB)
              id: u.id,
              name: u.name || '',
              role: u.role || '',
              company: u.company as Company || Company.SEMRUMO,
              email: u.email || '',
              department: u.department || '',
              status: u.status as UserStatus || UserStatus.ACTIVE,
              photoUrl: u.photo_url || 'https://picsum.photos/200/200',
              attendanceConfig: u.attendance_config || DEFAULT_ATTENDANCE_CONFIG,
              workStartTime: u.work_start_time || '09:00',
              workEndTime: u.work_end_time || '18:00',
              pin: undefined,
              requiresNewPin: false, 

              // Default values for non-essential fields (optimized for fast load)
              created_at: u.created_at || new Date().toISOString(),
              iban: '',
              nif: '',
              cc: '',
              address: '',
              birthDate: '',
              admissionDate: new Date().toISOString().split('T')[0],
              phone: '',
              emergencyContact: undefined,
              bio: undefined,
              onboardingTasks: DEFAULT_ONBOARDING_TASKS,
              documents: [],
              lunchStartTime: '13:00',
              lunchEndTime: '14:00',
              vacationDaysYearly: 0,
              vacationDaysCarryover: 0,
              vacationAdjustments: 0,
              niss: '',
              nationality: '',
              maritalStatus: undefined,
              mobilePhone: '',
              whatsappEnabled: false,
              locationId: undefined,
              locationIds: [],
              scheduleCycleStartDate: undefined
            }));
            currentUsersList = freshMappedUsers;
            setUsers(freshMappedUsers);
          } else if (usersRes.error) {
            console.error('❌ [App] Supabase fetch failed:', usersRes.error);
          }
        }
        
        const mappedUsers = currentUsersList;

        // Users loaded — Login page can now proceed
        setLoading(false);

        // Resolve active authenticated user immediately without waiting for React re-render
        const authUserId = Number(authUser.id);
        const resolvedUser: User = mappedUsers.find(u => Number(u.id) === authUserId) || currentUser || {
          id: authUserId,
          name: authUser.name,
          email: authUser.email || '',
          role: authUser.role,
          company: Company.SEMRUMO,
          status: UserStatus.ACTIVE,
          created_at: new Date().toISOString(),
          photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name || 'user')}&background=random`,
          attendanceConfig: DEFAULT_ATTENDANCE_CONFIG,
          workStartTime: '09:00',
          workEndTime: '18:00',
          iban: '',
          nif: '',
          cc: '',
          address: '',
          birthDate: '',
          admissionDate: new Date().toISOString().split('T')[0],
          phone: '',
          lunchStartTime: '13:00',
          lunchEndTime: '14:00',
          vacationDaysYearly: 0,
          vacationDaysCarryover: 0,
          vacationAdjustments: 0,
          onboardingTasks: DEFAULT_ONBOARDING_TASKS,
          documents: [],
          department: '',
          niss: '',
          nationality: '',
          mobilePhone: '',
          whatsappEnabled: false,
          locationIds: []
        };

        // Immediately update React state so the UI and router have the user
        setCurrentUser(resolvedUser);

        // Check if user should see all records (not just their own)
        const roleStr = (resolvedUser.role || '').toUpperCase();
        const canViewAllRecords = roleStr === 'ADMIN' || roleStr === 'ADMINISTRADOR' || roleStr === 'AUDITOR' || roleStr === 'RH' || roleStr === 'RESPONSÁVEL DE DEPARTAMENTO' || roleStr === 'DIRETOR DE UNIDADE';
        console.log(`[App] 🔐 User: ${resolvedUser.name} (${resolvedUser.id}) | Role: ${resolvedUser.role} | Can view all records: ${canViewAllRecords}`);

        // === DEMO MODE EARLY RETURN ===
        if (isDemoMode()) {
           console.log('[App] 🟢 Demo Mode Active - Bypassing Phase 2 Supabase queries');
           setTimeLogs([]);
           setAbsences([]);
           setLeaves([]);
           setExpenses([]);
           setEvents([]);
           setMessages([]);
           setLockedMonths([]);
           setJobRoles([]);
           setLeaveTypes([]);
           setScheduleTemplates([]);
           setSchedulePeriods([]);
           setLocations([]);
           setDepartments([]);
           setHourBankAdjustments([]);
           setAnomalies([]);
           setHolidays([]);
           setWhatsappAutoAlerts(false);
           setSurveyResponses([]);
           setAnonymousFeedbacks([]);
           setDataReady(true);
           return;
        }

        // PRE-BUILD QUERIES TO FIX TYPESCRIPT POSTGREST BUILDERS
        // OPTIMIZATION: Prioritize today's logs for immediate attendance visibility
        const today = new Date().toISOString().split('T')[0];
        console.log(`[App] 📅 Today's date: ${today} | Filter from: ${dateFilter}`);

        let logsQuery = supabase.from('time_logs').select('*').gte('date', dateFilter).order('date', { ascending: false }).order('check_in', { ascending: false });
        if (!canViewAllRecords) {
          console.log(`[App] ⚠️ Regular user - filtering by user_id: ${resolvedUser.id}`);
          logsQuery = logsQuery.eq('user_id', resolvedUser.id);
        } else {
          console.log(`[App] ✅ Management user - loading ALL users' logs`);
        }

        let leavesQuery = supabase.from('leaves').select('*').order('start_date', { ascending: false });
        if (!canViewAllRecords) leavesQuery = leavesQuery.eq('user_id', resolvedUser.id);

        let anomaliesQuery = supabase.from('anomalies').select('*').gte('created_at', dateFilter).order('created_at', { ascending: false });
        if (!canViewAllRecords) anomaliesQuery = anomaliesQuery.eq('user_id', resolvedUser.id).limit(100);
        else anomaliesQuery = anomaliesQuery.limit(500);

        let hbAdjQuery = supabase.from('hour_bank_adjustments').select('*').order('created_at', { ascending: false });
        if (!canViewAllRecords) hbAdjQuery = hbAdjQuery.eq('user_id', resolvedUser.id);
        else hbAdjQuery = hbAdjQuery.limit(500);

        let expensesQuery = supabase.from('expenses').select('*').order('date', { ascending: false });
        if (!canViewAllRecords) expensesQuery = expensesQuery.eq('user_id', resolvedUser.id).limit(200);
        else expensesQuery = expensesQuery.limit(500);

        let messagesQuery = supabase.from('internal_messages').select('*').order('date', { ascending: false });
        if (!canViewAllRecords) messagesQuery = messagesQuery.or(`sender_id.eq.${resolvedUser.id},receiver_id.eq.${resolvedUser.id}`).limit(100);
        else messagesQuery = messagesQuery.limit(500);

        // OPTIMIZATION: Split requests into smaller batches and add safety Limits (.limit(500))
        const batch1 = await Promise.all([
          logsQuery,
          supabase.from('locations').select('*').order('name', { ascending: true }),
          supabase.from('schedule_templates').select('*').order('name', { ascending: true }),
          supabase.from('leave_types').select('*').order('name', { ascending: true }),
          leavesQuery
        ]);

        const batch2 = await Promise.all([
          supabase.from('departments').select('*').order('name', { ascending: true }),
          supabase.from('job_roles').select('*').order('name', { ascending: true }),
          supabase.from('holidays').select('*').order('name', { ascending: true }),
          supabase.from('schedule_periods').select('*').order('name', { ascending: true }),
          supabase.from('locked_months').select('*').order('year', { ascending: false }).order('month', { ascending: false })
        ]);

        const batch3 = await Promise.all([
          anomaliesQuery,
          supabase.from('anomaly_types').select('*').order('name', { ascending: true }),
          hbAdjQuery,
          expensesQuery,
          messagesQuery
        ]);

        const batch4 = await Promise.all([
          supabase.from('events').select('*').order('date', { ascending: true }),
          getSetting('whatsapp_auto_alerts'),
          // Only Admins need to read surveys and feedback
          canViewAllRecords ? supabase.from('survey_responses').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
          canViewAllRecords ? supabase.from('anonymous_feedback').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] })
        ]);

        // Recombine variables to preserve mapping logic
        const [logsRes, locationsRes, templatesRes, leaveTypesRes, leavesRes] = batch1;
        const [deptsRes, rolesRes, holidaysRes, periodsRes, locksRes] = batch2;
        const [anomaliesRes, anomalyTypesRes, hbAdjRes, expensesRes, messagesRes] = batch3;
        const [eventRes, autoAlertsRes, surveyBatchRes, feedbackBatchRes] = batch4;

        // === PHASE 3: Data Mapping & State Updates ===
        // Wrap each mapping in its own safety check to ensure partial failures don't block everything
        
        // Log individual errors if any occurred, but continue mapping where data exists
        if (logsRes.error) console.error('❌ [App] TimeLogs fetch error:', logsRes.error);
        if (locationsRes.error) console.error('❌ [App] Locations fetch error:', locationsRes.error);
        if (templatesRes.error) console.error('❌ [App] ScheduleTemplates fetch error:', templatesRes.error);
        if (leaveTypesRes.error) console.error('❌ [App] LeaveTypes fetch error:', leaveTypesRes.error);
        if (leavesRes.error) console.error('❌ [App] Leaves fetch error:', leavesRes.error);
        if (deptsRes.error) console.error('❌ [App] Departments fetch error:', deptsRes.error);
        if (rolesRes.error) console.error('❌ [App] JobRoles fetch error:', rolesRes.error);
        if (holidaysRes.error) console.error('❌ [App] Holidays fetch error:', holidaysRes.error);
        if (periodsRes.error) console.error('❌ [App] SchedulePeriods fetch error:', periodsRes.error);
        if (locksRes.error) console.error('❌ [App] LockedMonths fetch error:', locksRes.error);
        if (anomaliesRes.error) console.error('❌ [App] Anomalies fetch error:', anomaliesRes.error);
        if (anomalyTypesRes.error) console.error('❌ [App] AnomalyTypes fetch error:', anomalyTypesRes.error);
        if (hbAdjRes.error) console.error('❌ [App] HBAdj fetch error:', hbAdjRes.error);
        if (expensesRes.error) console.error('❌ [App] Expenses fetch error:', expensesRes.error);
        if (messagesRes.error) console.error('❌ [App] Messages fetch error:', messagesRes.error);

        // Map TimeLogs
        if (logsRes.data) {
          console.log(`[App] ✅ Loaded ${logsRes.data.length} time logs (90-day window)`);
          const today = new Date().toISOString().split('T')[0];
          const todayLogs = logsRes.data.filter((l: any) => l.date === today);
          console.log(`[App] 📊 Today's logs: ${todayLogs.length}/${logsRes.data.length}`);

          setTimeLogs(logsRes.data.map((l: any) => ({
            id: l.id,
            userId: Number(l.user_id) || l.user_id,
            date: l.date,
            checkIn: l.check_in,
            checkOut: l.check_out,
            status: l.status as TimeLogStatus,
            checkInLocation: l.check_in_location,
            checkInIp: l.check_in_ip,
            checkInCoordinates: l.check_in_coordinates,
            checkOutLocation: l.check_out_location,
            checkOutIp: l.check_out_ip,
            checkOutCoordinates: l.check_out_coordinates,
            totalHours: l.total_hours,
            breakStart: l.break_start,
            breakEnd: l.break_end
          })));
        }

        // Map Schedule Templates
        if (templatesRes.data) {
          setScheduleTemplates(templatesRes.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            weeklyPattern: t.weekly_pattern || [],
            cycleDays: t.cycle_days,
            cyclePattern: t.cycle_pattern,
            totalWeeklyHours: t.total_weekly_hours,
            createdAt: t.created_at
          })));
        }

        // Map Expenses
        if (expensesRes.data) {
          setExpenses(expensesRes.data.map((e: any) => ({
            id: e.id,
            userId: e.user_id,
            userName: e.user_name,
            userCompany: e.user_company,
            date: e.date,
            category: e.category,
            amount: e.amount,
            description: e.description,
            status: e.status,
            submissionDate: e.submission_date,
            rejectionReason: e.rejection_reason
          })));
        }

        // Map Messages
        if (messagesRes.data) {
          setMessages(messagesRes.data.map((m: any) => ({
            id: m.id,
            senderId: m.sender_id || 'SYSTEM',
            senderName: m.sender_name,
            receiverId: m.receiver_id,
            subject: m.subject,
            content: m.content,
            date: m.date,
            read: m.read,
            priority: m.priority
          })));
        }

        // Map Events
        if (eventRes.data) {
          setEvents(eventRes.data.map((e: any) => ({
            id: e.id,
            title: e.title,
            date: e.date,
            type: e.type as EventType,
            description: e.description,
            location: e.location
          })));
        }

        // Map Locked Months
        if (locksRes.data) {
          setLockedMonths(locksRes.data.map((l: any) => ({
            id: l.id,
            year: l.year,
            month: l.month,
            isLocked: l.is_locked
          })));
        }

        // Map Job Roles
        if (rolesRes.data) {
          setJobRoles(rolesRes.data.map((r: any) => ({
            id: r.id,
            name: r.name
          })));
        }

        // Map Holidays
        if (holidaysRes.data) {
          setHolidays(holidaysRes.data.map((h: any) => ({
            id: h.id,
            date: h.date,
            name: h.name,
            type: h.type,
            year: h.year
          })));
        }

        // Map Locations
        if (locationsRes.data) {
          setLocations(locationsRes.data.map((l: any) => ({
            ...l,
            postalCode: l.postal_code,
            coordinates: l.coordinates,
            allowedIps: l.allowed_ips,
            toleranceEntry: l.tolerance_entry,
            toleranceExit: l.tolerance_exit,
            blockEntry: l.block_entry,
            blockExit: l.block_exit,
            notificationEmails: l.notification_emails,
            extraHoursStart: l.extra_hours_start,
            missingHoursStart: l.missing_hours_start,
            countExtraAfterExit: l.count_extra_after_exit,
            timezone: l.timezone,
            managerId: l.manager_id,
            createdAt: l.created_at
          })));
        }

        // Map Schedule Periods
        if (periodsRes.data) {
          setSchedulePeriods(periodsRes.data.map((p: any) => ({
            ...p,
            affectedSchedules: p.affected_schedules,
            deductHours: p.deduct_hours,
            excelCode: p.excel_code,
            createdAt: p.created_at
          })));
        }

        // Map Departments
        if (deptsRes.data) {
          setDepartments(deptsRes.data.map((d: any) => ({
            id: d.id,
            name: d.name,
            managerId: d.manager_id
          })));
        }

        // Map Anomaly Types
        if (anomalyTypesRes.data) {
          setAnomalyTypes(anomalyTypesRes.data.map((a: any) => ({
            id: a.id,
            name: a.name,
            isJustified: a.is_justified,
            type: a.type,
            rhCode: a.rh_code,
            status: a.status,
            createdAt: a.created_at
          })));
        }

        // Map Leave Types
        if (leaveTypesRes.data) {
          setLeaveTypes(leaveTypesRes.data.map((lt: any) => ({
            id: lt.id,
            name: lt.name,
            color: lt.color || '#3B82F6',
            deductsVacation: lt.deducts_vacation ?? false,
            requiresApproval: lt.requires_approval ?? true,
            createdAt: lt.created_at
          })));
        }

        // Map Leaves + Absences (Legacy Support)
        if (leavesRes.data) {
          const mappedLeaves: Leave[] = leavesRes.data.map((l: any) => ({
            id: l.id,
            userId: l.user_id,
            leaveTypeId: l.leave_type_id,
            startDate: l.start_date,
            endDate: l.end_date,
            status: normalizeLeaveStatus(l.status),
            notes: l.notes,
            approvedBy: l.approved_by,
            createdAt: l.created_at,
            updatedAt: l.updated_at,
            approvalStep: l.approval_step,
            managerApprovalStatus: l.manager_approval_status,
            hrApprovalStatus: l.hr_approval_status,
            attachmentUrl: l.attachment_url,
            isWorkingAbsence: l.is_working_absence
          }));
          setLeaves(mappedLeaves);

          const mappedAbsences: Absence[] = leavesRes.data.map((l: any) => {
            const lt = (leaveTypesRes.data || []).find((t: any) => t.id === l.leave_type_id);
            const user = mappedUsers.find(u => u.id === l.user_id);
            return {
              id: l.id,
              userId: l.user_id,
              userName: user?.name || 'Unknown',
              company: user?.company || Company.SEMRUMO,
              status: l.status as AbsenceStatus,
              type: (lt?.name || 'Ausência') as AbsenceType,
              startDate: l.start_date,
              endDate: l.end_date,
              notes: l.notes
            };
          });
          setAbsences(mappedAbsences);
        }

        // Map Anomalies (Records)
        if (anomaliesRes.data) {
          setAnomalies(anomaliesRes.data.map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            timeLogId: a.time_log_id,
            type: a.type,
            minutes: a.minutes,
            status: a.status,
            managerId: a.manager_id,
            managerNotes: a.manager_notes,
            employeeJustification: a.employee_justification,
            createdAt: a.created_at
          })));
        }

        // Map Hour Bank Adjustments
        if (hbAdjRes.data) {
          setHourBankAdjustments(hbAdjRes.data.map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            adjustmentMinutes: a.adjustment_minutes,
            reason: a.reason,
            type: a.type,
            createdBy: a.created_by,
            createdAt: a.created_at
          })));
        }

        // Map Survey Responses
        if (surveyBatchRes.data) {
          setSurveyResponses(surveyBatchRes.data.map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            surveyType: s.survey_type,
            referenceDate: s.reference_date,
            rating: s.rating,
            feedback: s.feedback,
            createdAt: s.created_at
          })));
        }

        // Map Anonymous Feedback
        if (feedbackBatchRes.data) {
          setAnonymousFeedbacks(feedbackBatchRes.data.map((f: any) => ({
            id: f.id,
            category: f.category,
            content: f.content,
            status: f.status,
            hrResponse: f.hr_response,
            resolvedBy: f.resolved_by,
            createdAt: f.created_at,
            updatedAt: f.updated_at
          })));
        }

        // Automation Status
        if (autoAlertsRes === 'true') setWhatsappAutoAlerts(true);

        // All data loaded — mark as ready
        setDataReady(true);


      } catch (err) {
        console.error("[App] Error loading data:", err);
        setLoading(false); // Ensure login is unblocked even on error (fallback to offline/cache)
        setDataReady(true); // Still mark as ready so UI isn't stuck on spinner
        addToast('error', 'Erro ao carregar dados do servidor. Modo offline ativo.');
      }
    };
    fetchData();
  }, [authSessionKey, authUser?.id]);

  // POLLING: Refresh critical tables every 60s to keep data fresh across sessions
  useEffect(() => {
    const refreshData = async () => {
      try {
        if (!currentUser) return;
        const roleStr = (currentUser.role || '').toUpperCase();
        const canViewAllRecords = roleStr === 'ADMIN' || roleStr === 'ADMINISTRADOR' || roleStr === 'AUDITOR' || roleStr === 'RH' || roleStr === 'RESPONSÁVEL DE DEPARTAMENTO' || roleStr === 'DIRETOR DE UNIDADE';

        let latestUsers = users;

        // 1. Refresh Users (detect changes from other admins) - ONLY for admins
        if (canViewAllRecords) {
          const { data: usersData } = await supabase.from('users').select('id, name, role, company, created_at, email, department, iban, status, nif, cc, address, birth_date, admission_date, phone, photo_url, emergency_contact, bio, onboarding_tasks, documents, attendance_config, work_start_time, work_end_time, lunch_start_time, lunch_end_time, vacation_days_yearly, vacation_days_carryover, vacation_adjustments, requires_new_pin, niss, nationality, marital_status, mobile_phone, whatsapp_enabled, location_id, location_ids, schedule_template_id, schedule_cycle_start_date').order('id', { ascending: true });
          if (usersData) {
            const mappedUsers: User[] = usersData.map((u: any) => ({
              id: u.id,
              name: u.name || '',
              role: u.role || '',
              company: u.company as Company || Company.SEMRUMO,
              created_at: u.created_at,
              email: u.email || '',
              department: u.department || '',
              iban: u.iban,
              status: u.status as UserStatus || UserStatus.ACTIVE,
              nif: u.nif || '',
              cc: u.cc || '',
              address: u.address || '',
              birthDate: u.birth_date || '',
              admissionDate: u.admission_date || new Date().toISOString().split('T')[0],
              phone: u.phone || '',
              photoUrl: u.photo_url || 'https://picsum.photos/200/200',
              emergencyContact: u.emergency_contact,
              bio: u.bio,
              onboardingTasks: u.onboarding_tasks || DEFAULT_ONBOARDING_TASKS,
              documents: u.documents || [],
              attendanceConfig: u.attendance_config || DEFAULT_ATTENDANCE_CONFIG,
              workStartTime: u.work_start_time || '09:00',
              workEndTime: u.work_end_time || '18:00',
              lunchStartTime: u.lunch_start_time || '13:00',
              lunchEndTime: u.lunch_end_time || '14:00',
              vacationDaysYearly: u.vacation_days_yearly,
              vacationDaysCarryover: u.vacation_days_carryover,
              vacationAdjustments: u.vacation_adjustments,
              pin: undefined, // PIN is not loaded in polling for security
              requiresNewPin: u.requires_new_pin,
              niss: u.niss,
              nationality: u.nationality,
              maritalStatus: u.marital_status,
              mobilePhone: u.mobile_phone,
              whatsappEnabled: u.whatsapp_enabled,
              locationId: u.location_id,
              locationIds: u.location_ids || [],
              scheduleTemplateId: u.schedule_template_id,
              scheduleCycleStartDate: u.schedule_cycle_start_date
            }));
            setUsers(mappedUsers);
            latestUsers = mappedUsers;

            // Keep currentUser in sync
            const fresh = mappedUsers.find(u => u.id === currentUser.id);
            if (fresh) setCurrentUser(fresh);
          }
        } else {
            // Keep currentUser in sync without fetching all users
            const { data: freshUser } = await supabase.from('users').select('id, name, role, company, created_at, email, department, iban, status, nif, cc, address, birth_date, admission_date, phone, photo_url, emergency_contact, bio, onboarding_tasks, documents, attendance_config, work_start_time, work_end_time, lunch_start_time, lunch_end_time, vacation_days_yearly, vacation_days_carryover, vacation_adjustments, requires_new_pin, niss, nationality, marital_status, mobile_phone, whatsapp_enabled, location_id, location_ids, schedule_template_id, schedule_cycle_start_date').eq('id', currentUser.id).single();
            if (freshUser) {
                const updatedCurrentUser: User = { ...currentUser, ...freshUser, pin: undefined };
                setCurrentUser(updatedCurrentUser);
                const updatedUsers = users.map(u => u.id === currentUser.id ? updatedCurrentUser : u);
                setUsers(updatedUsers);
                latestUsers = updatedUsers;
            }
        }

        // 2. Refresh Logs (90 days covering full current and past month)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const recentDateFilter = ninetyDaysAgo.toISOString().split('T')[0];
        let logsQuery = supabase.from('time_logs').select('*')
          .gte('date', recentDateFilter)
          .order('date', { ascending: false })
          .order('check_in', { ascending: false });
          
        if (!canViewAllRecords) {
            logsQuery = logsQuery.eq('user_id', currentUser.id);
        }
        
        const { data: logsData } = await logsQuery;
        
        if (logsData) {
          const mappedLogs: TimeLog[] = logsData.map((l: any) => ({
            id: l.id,
            userId: Number(l.user_id) || l.user_id,
            date: l.date,
            checkIn: l.check_in,
            checkOut: l.check_out,
            status: l.status as TimeLogStatus,
            checkInLocation: l.check_in_location,
            checkInIp: l.check_in_ip,
            checkInCoordinates: l.check_in_coordinates,
            checkOutLocation: l.check_out_location,
            checkOutIp: l.check_out_ip,
            checkOutCoordinates: l.check_out_coordinates,
            totalHours: l.total_hours,
            breakStart: l.break_start,
            breakEnd: l.break_end
          }));
          setTimeLogs(mappedLogs);
        }

        // 3. Refresh Leaves
        let leavesQuery = supabase.from('leaves').select('*').order('start_date', { ascending: false });
        if (!canViewAllRecords) {
            leavesQuery = leavesQuery.eq('user_id', currentUser.id);
        }
        const { data: leavesData } = await leavesQuery;
        
        if (leavesData) {
          const mappedLeaves: Leave[] = leavesData.map((l: any) => ({
            id: l.id,
            userId: l.user_id,
            leaveTypeId: l.leave_type_id,
            startDate: l.start_date,
            endDate: l.end_date,
            status: normalizeLeaveStatus(l.status),
            notes: l.notes,
            approvedBy: l.approved_by,
            createdAt: l.created_at,
            updatedAt: l.updated_at,
            approvalStep: l.approval_step,
            managerApprovalStatus: l.manager_approval_status,
            hrApprovalStatus: l.hr_approval_status,
            attachmentUrl: l.attachment_url,
            isWorkingAbsence: l.is_working_absence
          }));
          setLeaves(mappedLeaves);

          // Update Legacy Absences
          const mappedAbsences: Absence[] = leavesData.map((l: any) => {
            const lt = leaveTypes.find(t => t.id === l.leave_type_id);
            const user = latestUsers.find((u: any) => u.id === l.user_id);

            return {
              id: l.id,
              userId: l.user_id,
              userName: user?.name || 'Unknown',
              company: (user?.company as Company) || Company.SEMRUMO,
              status: l.status as AbsenceStatus,
              type: (lt?.name || 'Ausência') as AbsenceType,
              startDate: l.start_date,
              endDate: l.end_date,
              notes: l.notes
            };
          });
          setAbsences(mappedAbsences);
        }

        // 4. Refresh Anomalies
        let anomaliesQuery = supabase.from('anomalies').select('*').gte('created_at', recentDateFilter).order('created_at', { ascending: false });
        if (!canViewAllRecords) anomaliesQuery = anomaliesQuery.eq('user_id', currentUser.id).limit(100);
        
        const { data: anomaliesData } = await anomaliesQuery;
        if (anomaliesData) {
          setAnomalies(anomaliesData.map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            timeLogId: a.time_log_id,
            type: a.type,
            minutes: a.minutes,
            status: a.status,
            managerId: a.manager_id,
            managerNotes: a.manager_notes,
            employeeJustification: a.employee_justification,
            createdAt: a.created_at
          })));
        }

        // 5. Refresh Notifications
        if (currentUser) {
          const notifs = await notificationService.getByUser(currentUser.id, 50);
          setNotifications(notifs);
          setUnreadNotifCount(notifs.filter(n => !n.read).length);
        }
      } catch (err) {
        // Silent fail — polling should never crash the app
        console.warn('Polling refresh error:', err);
      }
    };

    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, [leaveTypes, currentUser]);

  // --- NOTIFICATION HELPERS ---
  const emitNotification = async (params: CreateNotificationParams) => {
    const notif = await notificationService.create(params);
    if (notif && currentUser && params.userId === currentUser.id) {
      setNotifications(prev => [notif, ...prev]);
      setUnreadNotifCount(prev => prev + 1);
    }
  };

  const emitNotificationBulk = async (
    userIds: number[],
    params: Omit<CreateNotificationParams, 'userId'>
  ) => {
    await notificationService.createBulk(userIds, params);
    if (currentUser && userIds.includes(currentUser.id)) {
      const latest = await notificationService.getByUser(currentUser.id, 1);
      if (latest.length > 0) {
        setNotifications(prev => [latest[0], ...prev]);
        setUnreadNotifCount(prev => prev + 1);
      }
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadNotifCount(prev => Math.max(0, prev - 1));
    await notificationService.markRead(id);
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadNotifCount(0);
    await notificationService.markAllRead(currentUser.id);
  };

  // Birthday System Check (uses ref to prevent infinite loop)
  useEffect(() => {
    if (users.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const birthdayMessages: InternalMessage[] = [];
    users.forEach(user => {
      if (user.status !== UserStatus.ACTIVE || !user.birthDate) return;
      const bDate = new Date(user.birthDate + 'T00:00:00');
      const today = new Date();
      if (bDate.getMonth() === today.getMonth() && bDate.getDate() === today.getDate()) {
        const key = `bday-${user.id}-${todayStr}`;
        if (!sentBirthdaysRef.current.has(key)) {
          sentBirthdaysRef.current.add(key);
          birthdayMessages.push({
            id: key,
            senderId: 'SYSTEM', senderName: 'SEMRUMO Team', receiverId: user.id,
            subject: 'Feliz Aniversário! 🎉', content: 'Parabéns pelo teu aniversário! Desejamos-te um dia fantástico.', date: todayStr, read: false, priority: 'NORMAL'
          });
        }
      }
    });
    if (birthdayMessages.length > 0) setMessages(prev => [...birthdayMessages, ...prev]);
  }, [users]);

  // ATTENDANCE AUTOMATION (WhatsApp Alerts — per-user opt-in)
  useEffect(() => {
    if (!whatsappAutoAlerts) return;
    if (users.length === 0) return;

    // Only run if at least one user has whatsappEnabled
    const hasAnyEnabled = users.some(u => u.whatsappEnabled);
    if (!hasAnyEnabled) return;

    let isRunning = false; // Concurrency guard

    const runCheck = async () => {
      if (isRunning) return;
      isRunning = true;
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Skip early morning or late night
        if (now.getHours() < 6 || now.getHours() > 22) return;

        // Ensure Wassenger is configured
        try {
          await wassengerService.loadConfig();
          if (!wassengerService.isConfigured()) {
            console.warn("[Automation] Wassenger API key not configured, skipping alerts.");
            return;
          }
        } catch {
          return;
        }

        // Get the current sent-alerts set from ref
        const sentAlerts = alertsSentTodayRef.current;

        for (const user of users) {
          // Only send to users who have opted in AND are active AND have a schedule
          if (!user.whatsappEnabled) continue;
          if (user.status !== UserStatus.ACTIVE || !user.workStartTime) continue;

          // Must have a phone number
          const phone = user.mobilePhone || user.phone;
          if (!phone) continue;

          // Check if user has approved leave today
          const hasLeave = leaves.some(l =>
            l.userId === user.id &&
            l.status === 'APPROVED' &&
            todayStr >= l.startDate && todayStr <= l.endDate
          );
          if (hasLeave) continue;

          let effectiveStartTime = user.workStartTime;
          let isWorkingDay = true;
          const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

          const template = user.scheduleTemplateId ? scheduleTemplates.find(t => t.id === user.scheduleTemplateId) : undefined;

          if (template) {
            const effectiveDay = getEffectiveScheduleDay(now, user, template);
            if (!effectiveDay || effectiveDay.isOff) {
              isWorkingDay = false;
            } else if (effectiveDay.start) {
              effectiveStartTime = effectiveDay.start;
            }
          } else if (user.schedule && Array.isArray(user.schedule)) {
            const todaySchedule = user.schedule.find(s => s.dayOfWeek === dayOfWeek);
            if (!todaySchedule || !todaySchedule.isWorkingDay) {
              isWorkingDay = false;
            }
          } else {
            // Fallback: If no schedule object, assume weekends (0 and 6) are off days
            if (dayOfWeek === 0 || dayOfWeek === 6) isWorkingDay = false;
          }

          if (!isWorkingDay) continue;

          const [startH, startM] = effectiveStartTime.split(':').map(Number);
          const startMinutesThreshold = (startH * 60 + startM) + 30; // Fixed 30-min tolerance

          // Check if they already logged in today
          const userLogToday = timeLogs.find(l => String(l.userId) === String(user.id) && l.date === todayStr);

          // Requirements:
          // 1. Apenas deve enviar "ao inicio da jornada de trabalho. 10min após o horário de entrada"
          // 2. Não deve enviar ao almoço (removed the 14:00 flexible check and removed exit checks)
          // 3. Continua a enviar quando já fiz o registo -> fixed by using local timezone for todayStr
          if (!userLogToday) {
            if (currentMinutes > startMinutesThreshold) {
              const alertId = `${user.id}-${todayStr}-ENTRY`;
              if (!sentAlerts.has(alertId)) {
                // Mark as sent BEFORE the async call to prevent duplicates
                sentAlerts.add(alertId);
                localStorage.setItem(`wa_alerts_${todayStr}`, JSON.stringify([...sentAlerts]));
                try {
                  await wassengerService.sendMessage(phone, `Não se esqueca de registar a entrada de hoje no portal.`);
                } catch (err) {
                  console.error(`[Automation] Failed to send to ${user.name}:`, err);
                  sentAlerts.delete(alertId);
                  localStorage.setItem(`wa_alerts_${todayStr}`, JSON.stringify([...sentAlerts]));
                }
              }
            }
          }
        }
      } finally {
        isRunning = false;
      }
    };

    // Run every 10 minutes
    const interval = setInterval(runCheck, 10 * 60 * 1000);

    // Initial run after data is settled (short delay)
    const timeout = setTimeout(runCheck, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [users, timeLogs, leaves, scheduleTemplates, whatsappAutoAlerts]);

  // SMART AUTO-CHECKOUT (Checkout Automático Inteligente)
  useEffect(() => {
    // Only run if user is admin (so it doesn't duplicate across all employee devices)
    if (!currentUser || currentUser.role !== UserRole.ADMIN) return;

    let isRunning = false;
    const autoCheckoutCheck = async () => {
      if (isRunning) return;
      isRunning = true;
      try {
        const now = new Date();
        const activeLogs = timeLogs.filter(l => !l.checkOut);
        
        let hasChanges = false;
        
        for (const log of activeLogs) {
          // Parse checkIn and date to a Date object
          const checkInStr = `${log.date}T${log.checkIn}`;
          const checkInDate = new Date(checkInStr);
          if (isNaN(checkInDate.getTime())) continue;

          const diffHours = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);

          // If log is older than 14 hours, auto-checkout
          if (diffHours >= 14) {
            console.log(`[AutoCheckout] Log ${log.id} from user ${log.userId} is older than 14 hours. Auto-closing.`);
            
            // Auto checkout exactly 9 hours after check-in
            const autoOutDate = new Date(checkInDate.getTime() + 9 * 60 * 60 * 1000);
            const autoOutTime = autoOutDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            const { error: updateError } = await supabase.from('time_logs').update({
              check_out: autoOutTime,
              check_out_location: 'Sistema (Auto-Checkout)',
              status: 'COMPLETED'
            }).eq('id', log.id);

            if (updateError) continue;

            // Create an anomaly
            await supabase.from('anomalies').insert({
              user_id: log.userId,
              date: log.date,
              type: 'ESQUECIMENTO_SAIDA',
              description: 'Saída registada automaticamente após 14h sem atividade.',
              time_log_id: log.id,
              detected_by: 'SISTEMA_INTELIGENTE',
              severity: 'MEDIUM',
              status: 'PENDING'
            });
            
            hasChanges = true;
          }
        }
        
        // Let the normal Realtime or Polling catch up the changes instead of complicated optimistic updates
        // but we can trigger a small state refresh if needed, though real-time should handle it.
      } catch (err) {
        console.error('[AutoCheckout] Error:', err);
      } finally {
        isRunning = false;
      }
    };

    // Run every 15 minutes
    const interval = setInterval(autoCheckoutCheck, 15 * 60 * 1000);
    // Initial run
    const timeout = setTimeout(autoCheckoutCheck, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [timeLogs, currentUser]);

  // Reset alerts sent at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        alertsSentTodayRef.current = new Set();
        // Clean up old localStorage keys
        const yesterday = new Date(now.getTime() - 86400000);
        const yYear = yesterday.getFullYear();
        const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
        const yDay = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
        localStorage.removeItem(`wa_alerts_${yesterdayStr}`);
      }
    };
    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, []);

  // Actions
  const handleUpdateUser = async (updatedUser: User, persist: boolean = true, options?: { silent?: boolean }) => {
    // Detect Who is Changing
    const changedByName = currentUser?.name || 'Sistema';

    // Log History (Compare old user with new user)
    const oldUser = users.find(u => u.id === updatedUser.id);
    if (oldUser && persist) {
      // Run async without awaiting to not block UI
      historyService.logChanges(oldUser, updatedUser, changedByName);
    }

    // Optimistic Update
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);

    if (!persist) return;

    // Helper: convert empty strings to null for optional fields
    const emptyToNull = (v: any) => (v === '' || v === undefined) ? null : v;

    // DB Update — resilient: auto-strip columns that don't exist in DB schema
    const rawUpdatePayload: Record<string, any> = {
      name: updatedUser.name,
      role: updatedUser.role,
      company: updatedUser.company,
      email: emptyToNull(updatedUser.email),
      department: emptyToNull(updatedUser.department),
      status: updatedUser.status,
      nif: emptyToNull(updatedUser.nif),
      cc: emptyToNull(updatedUser.cc),
      niss: emptyToNull(updatedUser.niss),
      nationality: emptyToNull(updatedUser.nationality),
      marital_status: emptyToNull(updatedUser.maritalStatus),
      address: emptyToNull(updatedUser.address),
      birth_date: emptyToNull(updatedUser.birthDate),
      admission_date: emptyToNull(updatedUser.admissionDate),
      phone: emptyToNull(updatedUser.phone),
      photo_url: emptyToNull(updatedUser.photoUrl),
      work_start_time: emptyToNull(updatedUser.workStartTime),
      work_end_time: emptyToNull(updatedUser.workEndTime),
      lunch_start_time: emptyToNull(updatedUser.lunchStartTime),
      lunch_end_time: emptyToNull(updatedUser.lunchEndTime),
      attendance_config: updatedUser.attendanceConfig || null,
      onboarding_tasks: updatedUser.onboardingTasks || null,
      mobile_phone: emptyToNull(updatedUser.mobilePhone),
      whatsapp_enabled: updatedUser.whatsappEnabled ?? false,
      documents: updatedUser.documents || null,
      iban: emptyToNull(updatedUser.iban),
      vacation_days_yearly: updatedUser.vacationDaysYearly ?? null,
      vacation_days_carryover: updatedUser.vacationDaysCarryover ?? null,
      vacation_adjustments: updatedUser.vacationAdjustments ?? null,
      emergency_contact: emptyToNull(updatedUser.emergencyContact),
      bio: emptyToNull(updatedUser.bio),
      pin: emptyToNull(updatedUser.pin),
      requires_new_pin: updatedUser.requiresNewPin ?? false,
      location_id: updatedUser.locationId || null,
      location_ids: updatedUser.locationIds || [],
      schedule_template_id: updatedUser.scheduleTemplateId || null,
      schedule_cycle_start_date: emptyToNull(updatedUser.scheduleCycleStartDate)
    };

    // Remove undefined/null keys — Supabase rejects them with 400
    const updatePayload = Object.fromEntries(
      Object.entries(rawUpdatePayload).filter(([_, v]) => v !== undefined && v !== null)
    );

    let payload = { ...updatePayload };
    let error: any = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await supabase.from('users').update(payload).eq('id', updatedUser.id);
      if (result.error && result.error.message?.includes('in the schema cache')) {
        const match = result.error.message.match(/(\w+)/);
        if (match) {
          console.warn(`[handleUpdateUser] Column '${match[1]}' not in DB, stripping and retrying...`);
          delete payload[match[1]];
          continue;
        }
      }
      error = result.error;
      break;
    }

    if (error) {
      console.error("Error updating user:", error);
      addToast('error', `Erro ao gravar: ${error.message || 'Dados inválidos'}`);
    } else {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (!options?.silent) {
        addToast('success', 'Dados do colaborador atualizados com sucesso.');
      }
    }
  };

  const handleAddUser = async (u: User) => {
    // DB Insert — sanitize empty strings to null for optional fields
    const emptyToNull = (v: any) => (v === '' || v === undefined) ? null : v;
    const dbUser: Record<string, any> = {
      name: u.name,
      role: u.role,
      company: u.company,
      email: emptyToNull(u.email),
      department: emptyToNull(u.department),
      status: u.status || 'ACTIVE',
      nif: emptyToNull(u.nif),
      cc: emptyToNull(u.cc),
      niss: emptyToNull(u.niss),
      nationality: emptyToNull(u.nationality),
      marital_status: emptyToNull(u.maritalStatus),
      address: emptyToNull(u.address),
      birth_date: emptyToNull(u.birthDate),
      admission_date: emptyToNull(u.admissionDate),
      phone: emptyToNull(u.phone),
      photo_url: emptyToNull(u.photoUrl) === 'https://picsum.photos/200/200' ? null : emptyToNull(u.photoUrl),
      work_start_time: emptyToNull(u.workStartTime),
      work_end_time: emptyToNull(u.workEndTime),
      lunch_start_time: emptyToNull(u.lunchStartTime),
      lunch_end_time: emptyToNull(u.lunchEndTime),
      vacation_days_yearly: u.vacationDaysYearly ?? 22,
      vacation_days_carryover: u.vacationDaysCarryover ?? 0,
      vacation_adjustments: u.vacationAdjustments ?? null,
      attendance_config: u.attendanceConfig || null,
      mobile_phone: emptyToNull(u.mobilePhone),
      whatsapp_enabled: u.whatsappEnabled ?? false,
      iban: emptyToNull(u.iban),
      emergency_contact: emptyToNull(u.emergencyContact),
      bio: emptyToNull(u.bio),
      pin: emptyToNull(u.pin),
      requires_new_pin: u.requiresNewPin ?? false,
      onboarding_tasks: u.onboardingTasks || null,
      documents: u.documents || null,
      location_id: u.locationId || null,
      location_ids: u.locationIds || [],
      schedule_template_id: u.scheduleTemplateId || null,
      schedule_cycle_start_date: u.scheduleCycleStartDate || null
    };



    // Resilient insert: auto-strip columns that don't exist in DB schema
    let payload = { ...dbUser };
    let data: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await supabase.from('users').insert(payload).select().single();
      if (result.error && result.error.message?.includes('in the schema cache')) {
        const match = result.error.message.match(/(\w+)/);
        if (match) {
          console.warn(`[handleAddUser] Column '${match[1]}' not in DB, stripping and retrying...`);
          delete payload[match[1]];
          continue;
        }
      }
      data = result.data;
      lastError = result.error;
      break;
    }

    if (lastError || !data) {
      console.error("Error creating user:", lastError);
      addToast('error', `Erro ao criar colaborador: ${lastError?.message || 'Erro desconhecido'}`);
      return;
    }

    const newUser = { ...u, id: data.id };

    // Log Creation
    historyService.logAction(newUser.id, 'CREATE', currentUser?.name || 'Sistema', { newValue: 'Perfil Criado' });

    setUsers(prev => [...prev, newUser]);
    addToast('success', `Colaborador ${u.name} criado com sucesso.`);
  };

  const handleUpdateAbsence = async (id: number, s: AbsenceStatus) => {
    // Check if month is locked
    const absenceToCheck = absences.find(a => a.id === id);
    if (absenceToCheck) {
      const d = new Date(absenceToCheck.startDate);
      const isLocked = lockedMonths.some(l => l.year === d.getFullYear() && l.month === d.getMonth() + 1 && l.isLocked);
      if (isLocked) {
        addToast('error', 'O mês desse registo está bloqueado. Não é possível alterar.');
        return;
      }
    }
    // Optimistic Update
    setAbsences(prev => prev.map(a => a.id === id ? { ...a, status: s } : a));

    // Map status enum to Portuguese DB constraint
    const dbStatus = AbsenceStatusLabels[s as AbsenceStatus] || 'Pendente';

    // DB Update (uses 'leaves' table - source of truth)
    if (!id) {
      console.warn("Update failed: No ID provided for leave");
      return;
    }
    const { error } = await supabase.from('leaves').update({ status: dbStatus }).eq('id', id);
    if (error) {
      console.error("Error updating leave:", error);
      addToast('error', 'Erro ao atualizar ausência na base de dados.');
      return;
    }

    // Keep leaves state in sync
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: s as any } : l));

    const abs = absences.find(a => a.id === id);
    if (abs) {
      const action = s === AbsenceStatus.APPROVED ? 'Aprovado' : 'Rejeitado';
      addToast(s === AbsenceStatus.APPROVED ? 'success' : 'info', `Pedido de ${abs.userName} ${action.toLowerCase()}.`);
    }
  };

  const handleAddAbsence = async (a: Absence) => {
    // Check if month is locked
    const d = new Date(a.startDate);
    const isLocked = lockedMonths.some(l => l.year === d.getFullYear() && l.month === d.getMonth() + 1 && l.isLocked);
    if (isLocked) {
      addToast('error', 'O mês desse registo está bloqueado. Não é possível adicionar ausências.');
      return;
    }

    // Map type name (Portuguese) to leave_type_id
    const typeName = (a.type || '').trim();
    const typeNameLower = typeName.toLowerCase();

    // Also support legacy English enum values
    const legacyMap: Record<string, string> = {
      VACATION: 'Férias', MEDICAL: 'Baixa Médica', PARENTAL: 'Licença Parental', REMOTE: 'Trabalho Remoto'
    };
    const resolvedName = legacyMap[typeName.toUpperCase()] || typeName;
    const resolvedNameLower = resolvedName.toLowerCase();

    const matchedType = leaveTypes.find(lt => lt.name.toLowerCase() === resolvedNameLower)
      || leaveTypes.find(lt => lt.name.toLowerCase() === typeNameLower)
      || leaveTypes.find(lt => lt.name.toLowerCase().includes(resolvedNameLower))
      || leaveTypes.find(lt => resolvedNameLower.includes(lt.name.toLowerCase()))
      || leaveTypes[0];
    const leaveTypeId = matchedType ? matchedType.id : null;

    if (!leaveTypeId) {
      console.error('No matching leave type found for:', a.type, 'Available:', leaveTypes.map(lt => lt.name));
      addToast('error', 'Tipo de ausência não encontrado. Verifique as configurações de tipos de ausência.');
      return;
    }

    // Build payload for database, filtering out undefined/null values
    const rawPayload: Record<string, any> = {
      user_id: a.userId,
      leave_type_id: leaveTypeId,
      start_date: a.startDate,
      end_date: a.endDate,
      status: 'pending', // Use lowercase for database
      notes: a.notes,
    };

    // Remove undefined/null keys — Supabase rejects them with 400
    const dbLeave = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined && v !== null)
    );

    // DB Insert into 'leaves' (with resiliency for missing columns)
    let payload = { ...dbLeave };
    let success = false;
    let finalData = null;

    while (!success) {
      const { data, error } = await supabase.from('leaves').insert(payload).select().single();
      if (!error && data) {
        success = true;
        finalData = data;
      } else if (error && error.message?.includes('column') && error.message?.includes('does not exist')) {
        const match = error.message.match(/(\w+)/);
        const col = match ? match[1] : null;
        if (col && col in payload) {
          console.warn(`[Resiliency] Stripping unsupported column "${col}" from leaves table`);
          const { [col]: _, ...rest } = payload as any;
          payload = rest;
        } else {
          break; // Unknown column or match failed
        }
      } else {
        console.error("Error adding leave:", error);
        break;
      }
    }

    if (!finalData) {
      addToast('error', 'Erro ao submeter pedido de ausência.');
      return;
    }

    const data = finalData;

    // Update Local State (leaves)
    const newLeave: Leave = {
      id: data.id,
      userId: a.userId,
      leaveTypeId: leaveTypeId,
      startDate: a.startDate,
      endDate: a.endDate,
      status: 'PENDING',
      notes: a.notes,
      createdAt: data.created_at
    };

    setLeaves(prev => [newLeave, ...prev]);

    // Legacy: Update absences state just in case some UI still depends on it, mapping Leave -> Absence
    const newAbsence: Absence = {
      ...a,
      id: data.id,
      status: 'Pendente' as AbsenceStatus
    };
    setAbsences(prev => [newAbsence, ...prev]);

    addToast('success', 'Pedido submetido com sucesso.');

    // Notify admins about new leave request
    const adminIds = users.filter((u: User) => u.role === 'ADMIN' || u.role === 'Administrador').map((u: User) => u.id);
    const requesterName = users.find((u: User) => u.id === a.userId)?.name || 'Colaborador';
    emitNotificationBulk(adminIds, {
      type: 'LEAVE_REQUEST',
      title: 'Novo Pedido de Ausência',
      description: `${requesterName} submeteu um pedido de ausência.`,
      severity: 'warning',
      actionType: 'APPROVE_LEAVE',
      referenceId: data.id,
      referenceTable: 'leaves',
      actionUrl: '/admin/absences',
    });
  };

  const handleAddExpense = async (e: Expense) => {
    const rawPayload: Record<string, any> = {
      user_id: e.userId,
      user_name: e.userName,
      user_company: e.userCompany,
      date: e.date,
      category: e.category,
      amount: e.amount,
      description: e.description,
      status: e.status,
      submission_date: e.submissionDate,
      receipt_url: e.receiptUrl
    };

    // Remove undefined/null keys
    const dbExpense = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined && v !== null)
    );

    const { data, error } = await supabase.from('expenses').insert(dbExpense).select().single();
    if (error || !data) {
      console.error("Expense Error:", error);
      addToast('error', 'Erro ao submeter despesa.');
      return;
    }

    setExpenses(prev => [{ ...e, id: data.id }, ...prev]);
    addToast('success', 'Despesa submetida com sucesso.');

    // Notify admins about new expense
    const adminIds = users.filter((u: User) => u.role === 'ADMIN' || u.role === 'Administrador').map((u: User) => u.id);
    emitNotificationBulk(adminIds, {
      type: 'EXPENSE_SUBMITTED',
      title: 'Nova Despesa Submetida',
      description: `${e.userName} submeteu uma despesa de ${e.amount}€.`,
      severity: 'info',
      referenceId: data.id,
      referenceTable: 'expenses',
      actionUrl: '/admin/expenses',
    });
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));

    // DB Update (Optimistic) - Filter out undefined/null values
    const rawPayload: Record<string, any> = {
      status: updatedExpense.status,
      rejection_reason: updatedExpense.rejectionReason
    };
    const updatePayload = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined && v !== null)
    );

    const { error } = await supabase.from('expenses').update(updatePayload).eq('id', updatedExpense.id);

    if (error) {
      console.error("Expense Update Error:", error);
      addToast('error', 'Erro ao atualizar despesa.');
    } else {
      addToast('info', `Despesa atualizada: ${updatedExpense.status}`);

      // Notify employee about expense decision
      if (updatedExpense.status === 'APPROVED' || updatedExpense.status === 'REJECTED') {
        const statusPt = updatedExpense.status === 'APPROVED' ? 'aprovada' : 'rejeitada';
        emitNotification({
          userId: updatedExpense.userId,
          type: updatedExpense.status === 'APPROVED' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
          title: `Despesa ${statusPt.charAt(0).toUpperCase() + statusPt.slice(1)}`,
          description: `A sua despesa de ${updatedExpense.amount}€ foi ${statusPt}.`,
          severity: updatedExpense.status === 'APPROVED' ? 'success' : 'error',
          referenceId: updatedExpense.id,
          referenceTable: 'expenses',
          actionUrl: '/portal/expenses',
        });
      }
    }
  };

  const handleAddTimeLog = async (l: TimeLog) => {
    // Check if month is locked
    const d = new Date(l.date);
    const isLocked = lockedMonths.some(lock => lock.year === d.getFullYear() && lock.month === d.getMonth() + 1 && lock.isLocked);
    if (isLocked) {
      addToast('error', 'O mês selecionado está bloqueado a edições.');
      return;
    }

    // HANDLE CHECK-OUT (Update existing log)
    if (l.checkOut && !l.checkIn) {
      // Find open log for this user and date
      const { data: openLog, error: fetchError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', l.userId)
        .eq('date', l.date)
        .is('check_out', null)
        .single();

      if (fetchError || !openLog) {
        // Fallback: check if there is ANY log for that day, maybe they are trying to edit?
        // For now, strict rule: Manual OUT needs an Open IN.
        addToast('error', 'Não foi encontrado um registo de entrada em aberto para esta data/user.');
        return;
      }

      // Calculate Hours with Automatic Lunch Mirroring
      let totalHours = 0;
      let breakStartStr: string | undefined;
      let breakEndStr: string | undefined;

      if (openLog.check_in) {
        const [h1, m1] = openLog.check_in.split(':').map(Number);
        const [h2, m2] = l.checkOut.split(':').map(Number);
        let rawHours = (h2 + m2 / 60) - (h1 + m1 / 60);

        // Fetch user full object with schedule if needed (l.user might be partial)
        const fullUser = users.find(u => u.id === l.userId);

        if (fullUser?.scheduleTemplateId) {
          const tmpl = scheduleTemplates.find(t => t.id === fullUser.scheduleTemplateId);
          // Use the log date for schedule lookup
          const logDate = new Date(l.date);
          const daySched = getEffectiveScheduleDay(logDate, fullUser, tmpl);

          if (daySched?.breakStart && daySched?.breakEnd) {
            const [bsH, bsM] = daySched.breakStart.split(':').map(Number);
            const [beH, beM] = daySched.breakEnd.split(':').map(Number);
            const bStart = bsH + bsM / 60;
            const bEnd = beH + beM / 60;
            const checkInVal = h1 + m1 / 60;
            const checkOutVal = h2 + m2 / 60;

            // If worked through the break (started before/at break start, ended after/at break end)
            if (checkInVal <= bStart && checkOutVal >= bEnd) {
              const bDuration = bEnd - bStart;
              rawHours -= bDuration;
              breakStartStr = daySched.breakStart;
              breakEndStr = daySched.breakEnd;
            }
          }
        }
        totalHours = rawHours > 0 ? rawHours : 0;
      }

      // Update DB
      const { data: updatedData, error: updateError } = await supabase
        .from('time_logs')
        .update({
          check_out: l.checkOut,
          check_out_location: l.checkOutLocation,
          check_out_ip: (typeof l.checkOutIp === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(l.checkOutIp)) ? l.checkOutIp : null,
          total_hours: totalHours,
          break_start: breakStartStr,
          break_end: breakEndStr
        })
        .eq('id', openLog.id)
        .select()
        .single();

      if (updateError || !updatedData) {
        console.error("Error updating manual log:", updateError);
        addToast('error', 'Erro ao atualizar registo de saída.');
        return;
      }

      // Update Local State
      setTimeLogs(prev => prev.map(log => log.id === openLog.id ? {
        ...log,
        checkOut: l.checkOut,
        checkOutLocation: l.checkOutLocation,
        checkOutIp: l.checkOutIp,
        totalHours: totalHours,
        breakStart: breakStartStr,
        breakEnd: breakEndStr,
        checkOutCoordinates: l.checkOutCoordinates
      } : log));

      addToast('success', 'Saída manual registada com sucesso.');
      return;
    }

    // HANDLE UPDATE OF EXISTING LOG (Correction)
    if (l.id && String(l.id).match(/^\d+$/)) {
      // If it has a numeric ID, it's likely an existing DB log we are editing
      // Note: ManualTimeEntry uses 'manual-timestamp' so this check distinguishes real DB updates vs new manual entries
      // But verify if ManualTimeEntry passes the ID correctly.
      // Actually, ManualTimeEntry generates a new ID. The edit logic in ManualTimeEntry is not fully wired to pass the ID back unless we changed it.
      // Wait, let's look at ManualTimeEntry again. It generates `id: 'manual-...'`.
      // So this block might not be hit by ManualTimeEntry as currently written. 
      // BUT if we change ManualTimeEntry to pass the ID, we need this handler.
      // HOWEVER, for now, let's focus on what `handleAddTimeLog` receives.
      // If the user uses the "pencil" icon in AttendanceControl, it navigates to ManualTimeEntry with ?edit=ID.
      // But ManualTimeEntry IGNORES that ID and creates a NEW log object with new ID.
      // So `handleAddTimeLog` receives a NEW log object.
      // If the user enters the SAME date and user, logic above `if (l.checkOut && !l.checkIn)` might match IF the log was open.
      // But if the log is CLOSED, `is('check_out', null)` will fail.

      // We need to handle the case where we are "overwriting" or "correcting" a closed log for that day.
      // Since ManualTimeEntry doesn't support "Edit Mode" fully yet (it creates new), 
      // the user effectively creates a DUPLICATE log if they try to "fix" a closed one, or it fails if we add constraints.

      // Let's look for a closed log for this user/date if we haven't found an open one.
      const { data: closedLog } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', l.userId)
        .eq('date', l.date)
        .not('check_out', 'is', null)
        .single();

      if (closedLog) {
        // Found a closed log. We should probably UPDATE it instead of creating a new one, 
        // assuming the user wants to correct the day's record.
        // This is a heuristic because ManualTimeEntry is "dumb".

        const checkInTime = l.checkIn || closedLog.check_in;
        const checkOutTime = l.checkOut || closedLog.check_out;

        // Calculate Hours with Lunch Mirroring
        let totalHours = 0;
        let breakStartStr: string | undefined;
        let breakEndStr: string | undefined;

        if (checkInTime && checkOutTime) {
          const [h1, m1] = checkInTime.split(':').map(Number);
          const [h2, m2] = checkOutTime.split(':').map(Number);
          let rawHours = (h2 + m2 / 60) - (h1 + m1 / 60);

          const fullUser = users.find(u => u.id === l.userId);
          if (fullUser?.scheduleTemplateId) {
            const tmpl = scheduleTemplates.find(t => t.id === fullUser.scheduleTemplateId);
            const logDate = new Date(l.date);
            const daySched = getEffectiveScheduleDay(logDate, fullUser, tmpl);

            if (daySched?.breakStart && daySched?.breakEnd) {
              const [bsH, bsM] = daySched.breakStart.split(':').map(Number);
              const [beH, beM] = daySched.breakEnd.split(':').map(Number);
              const bStart = bsH + bsM / 60;
              const bEnd = beH + beM / 60;
              const checkInVal = h1 + m1 / 60;
              const checkOutVal = h2 + m2 / 60;

              if (checkInVal <= bStart && checkOutVal >= bEnd) {
                const bDuration = bEnd - bStart;
                rawHours -= bDuration;
                breakStartStr = daySched.breakStart;
                breakEndStr = daySched.breakEnd;
              }
            }
          }
          totalHours = rawHours > 0 ? rawHours : 0;
        }

        const { data: updatedData, error: updateError } = await supabase
          .from('time_logs')
          .update({
            check_in: checkInTime,
            check_out: checkOutTime,
            total_hours: totalHours,
            break_start: breakStartStr,
            break_end: breakEndStr,
            check_in_location: l.checkInLocation || closedLog.check_in_location,
            check_out_location: l.checkOutLocation || closedLog.check_out_location
          })
          .eq('id', closedLog.id)
          .select()
          .single();

        if (updateError) {
          addToast('error', 'Erro ao atualizar registo existente.');
          return;
        }

        // Update Local
        setTimeLogs(prev => prev.map(log => log.id === closedLog.id ? {
          ...log,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          totalHours: totalHours,
          breakStart: breakStartStr,
          breakEnd: breakEndStr,
          checkInLocation: l.checkInLocation || closedLog.check_in_location,
          checkOutLocation: l.checkOutLocation || closedLog.check_out_location
        } : log));

        addToast('success', 'Registo existente atualizado (Correção).');
        return;
      }
    }

    // HANDLE CHECK-IN (Insert new log)
    // Note: check_in_ip is type inet in DB — only send valid IPs, not text strings
    const isValidIp = (v: any) => typeof v === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(v);
    const dbLog: Record<string, any> = {
      user_id: l.userId,
      date: l.date,
      check_in: l.checkIn,
      status: l.status,
      check_in_location: l.checkInLocation,
    };
    if (isValidIp(l.checkInIp)) dbLog.check_in_ip = l.checkInIp;
    if (l.checkInCoordinates) dbLog.check_in_coordinates = l.checkInCoordinates;

    // Resilient insert: auto-strip columns that don't exist in DB schema
    let logPayload = { ...dbLog };
    let data: any = null;
    let error: any = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await supabase.from('time_logs').insert(logPayload).select().single();
      if (result.error && result.error.message?.includes('in the schema cache')) {
        const match = result.error.message.match(/(\w+)/);
        if (match) {
          console.warn(`[handleAddTimeLog] Column '${match[1]}' not in DB, stripping and retrying...`);
          delete logPayload[match[1]];
          continue;
        }
      }
      data = result.data;
      error = result.error;
      break;
    }

    if (error || !data) {
      console.error("Error adding log:", error);
      addToast('error', `Erro ao registar ponto manual: ${error?.message || 'Erro desconhecido'}`);
      return;
    }

    // Update with correct ID from DB
    const newLog = { ...l, id: data.id };
    setTimeLogs(prev => [newLog, ...prev]);
    addToast('success', 'Registo de ponto manual adicionado.');
  };

  const handleClockIn = async (userEntry: User) => {
    // 0. SECURITY: Resolve Numeric ID
    const numericId = await resolveNumericUserId(userEntry.id, userEntry.email);
    if (!numericId) {
      addToast('error', 'Erro crítico: Não foi possível validar o seu identificador de utilizador.');
      return;
    }

    // 0. SECURITY: Fetch Fresh User Data
    // We must ensure we are validating against the latest DB state, not stale local state.
    const { data: freshUser, error: fetchError } = await supabase
      .from('users')
      .select('attendance_config')
      .eq('id', numericId)
      .single();

    let user = { ...userEntry, id: numericId };
    if (freshUser && !fetchError) {
      // Merge DB attendance_config into our User object
      user = {
        ...userEntry,
        id: numericId, // ENSURE NUMERIC ID IS PRESERVED
        attendanceConfig: freshUser.attendance_config
      };

    } else {
      console.warn("Could not fetch fresh user data, using potential stale state.", fetchError);
    }

    // HELPER: Get Expected Schedule
    let expectedStart = user.workStartTime;
    // Check Template
    if (user.scheduleTemplateId) {
      const tmpl = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);
      if (tmpl) {
        const daySched = getEffectiveScheduleDay(new Date(), user, tmpl);
        if (daySched && !daySched.isOff) {
          expectedStart = daySched.start;
        }
      }
    }

    // 0. GLOBAL RESTRICTIONS CHECK
    if (user.attendanceConfig?.blockEntry) {
      addToast('error', 'A sua picagem encontra-se bloqueada. Contacte a administração.');
      return;
    }

    const now = new Date();
    // Check Lock
    const isLocked = lockedMonths.some(lock => lock.year === now.getFullYear() && lock.month === now.getMonth() + 1 && lock.isLocked);
    if (isLocked) {
      addToast('error', 'O mês atual está fechado. Contacte o administrador.');
      return;
    }

    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    // Check if already clocked in (ignoring todayStr to catch overnight/forgotten exits)
    const existingLog = timeLogs.find(l => String(l.userId) === String(user.id) && !l.checkOut);

    if (existingLog) {
      // Calculate how many hours ago the shift started
      const [checkInH, checkInM] = (existingLog.checkIn || '00:00').split(':').map(Number);
      const shiftStart = new Date(existingLog.date + 'T00:00:00');
      shiftStart.setHours(checkInH, checkInM, 0, 0);
      const hoursElapsed = (now.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);

      // THRESHOLD: 16 hours covers even extended night shifts (e.g. 22:00→06:00 = 8h)
      // Anything under 16h is treated as a normal active shift (including overnight)
      const STALE_THRESHOLD_HOURS = 16;

      if (hoursElapsed < STALE_THRESHOLD_HOURS) {
        // Active shift (same day OR valid overnight shift) — block duplicate entry
        addToast('warning', `Já tem um turno em curso (entrada às ${existingLog.checkIn} de ${new Date(existingLog.date + 'T00:00:00').toLocaleDateString('pt-PT')}). Por favor registe a saída primeiro.`);
        return;
      }

      // FORGOTTEN EXIT: Log is open for 16+ hours — clearly stale
      try {
        const staleDate = existingLog.date;
        const autoCheckOut = '23:59';

        // 1. Close the stale log in DB
        const { error: closeError } = await supabase
          .from('time_logs')
          .update({
            check_out: autoCheckOut,
            check_out_location: 'Saída automática (esquecimento)',
            status: 'INCOMPLETE'
          })
          .eq('id', existingLog.id);

        if (closeError) throw closeError;

        // 2. Update local state
        setTimeLogs(prev => prev.map(l =>
          l.id === existingLog.id
            ? { ...l, checkOut: autoCheckOut, checkOutLocation: 'Saída automática (esquecimento)', status: TimeLogStatus.INCOMPLETE }
            : l
        ));

        // 3. Create anomaly for the forgotten exit
        const anomalyPayload = {
          user_id: user.id,
          date: staleDate,
          type: 'SAIDA_NAO_REGISTADA',
          description: `Saída não registada no dia ${new Date(staleDate + 'T00:00:00').toLocaleDateString('pt-PT')}. Fecho automático aplicado às 23:59.`,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        const { data: newAnomaly } = await supabase
          .from('anomalies')
          .insert(anomalyPayload)
          .select()
          .single();

        if (newAnomaly) {
          setAnomalies(prev => [{ ...newAnomaly, userId: newAnomaly.user_id, createdAt: newAnomaly.created_at }, ...prev]);
        }

        addToast('warning', `Turno de ${new Date(staleDate + 'T00:00:00').toLocaleDateString('pt-PT')} foi fechado automaticamente (esquecimento de saída). Foi gerada uma anomalia.`);

      } catch (err) {
        console.error('Error auto-closing stale log:', err);
        addToast('error', `Existe um turno aberto do dia ${existingLog.date} que não foi possível fechar automaticamente. Contacte a administração.`);
        return;
      }
    }

    // Determine Status based on location tolerance
    let status = TimeLogStatus.ON_TIME;
    let anomalyMinutes = 0;
    const isFlexible = user.attendanceConfig?.flexibleSchedule === true;

    // Skip late detection for flexible schedule users
    if (!isFlexible && expectedStart) {
      const checkInMins = getMinutesFromTime(timeStr);
      const startMins = getMinutesFromTime(expectedStart);
      // Get tolerance from user's location, default to 30 if not set
      const userLocation = locations.find(l => l.id === user.locationId);
      const toleranceMinutes = userLocation?.toleranceEntry ?? 30;

      if (checkInMins > startMins + toleranceMinutes) {
        status = TimeLogStatus.LATE;
        anomalyMinutes = checkInMins - startMins;
      }
    }

    // 1. Fetch IP Address (Early for Validation)
    let entryIp = 'Unknown';
    let ipError = false;
    try {
      // Primary Service
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      entryIp = ipData.ip;
    } catch (e) {
      console.warn("Primary IP fetch failed, trying fallback...", e);
      try {
        // Fallback Service
        const fallbackRes = await fetch('https://ipapi.co/json/');
        const fallbackData = await fallbackRes.json();
        entryIp = fallbackData.ip;
      } catch (e2) {
        console.warn("All IP fetches failed.", e2);
        entryIp = 'Error/Offline';
        ipError = true;
      }
    }

    // 2. Fetch Geolocation - EMERGENCY FIX
    let coords: { lat: number; lng: number } | null = null;
    let locationName = '';
    let isFallbackAuthorized = false;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        // EMERGENCY: More permissive GPS settings
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false, // Don't require high accuracy
            timeout: 10000,           // 10 seconds timeout
            maximumAge: 120000        // Accept cached position up to 2 minutes old
          }
        );
      });
      coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      locationName = `GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
    } catch (error) {
      console.warn('[Geolocation] GPS failed, checking fallback options:', error);
      
      const userLocation = locations.find(l => l.id === user.locationId);
      const allAllowedIps = new Set<string>();
      if (userLocation?.allowedIps) userLocation.allowedIps.split(',').forEach(ip => allAllowedIps.add(ip.trim()));
      if (user.locationIds) {
        user.locationIds.forEach(lid => {
          const loc = locations.find(l => l.id === lid);
          if (loc?.allowedIps) loc.allowedIps.split(',').forEach(ip => allAllowedIps.add(ip.trim()));
        });
      }

      const strictGeo = user.attendanceConfig?.restrictGeo ?? false;

      if (!ipError && allAllowedIps.size > 0 && allAllowedIps.has(entryIp)) {
        locationName = 'Validação por IP';
        isFallbackAuthorized = true;
      } else if (!strictGeo) {
        locationName = 'Localização indisponível (Autorizado)';
        isFallbackAuthorized = true;
      } else {
        addToast('error', 'Falta partilhar geo-localização para validar a picagem (Restrição Ativa).');
        return;
      }
    }

    // 3. VALIDATION LOGIC (Refined for Strict Toggles)
    const hasLocationConfig = (user.locationIds && user.locationIds.length > 0) || user.locationId;

    if (hasLocationConfig || user.attendanceConfig) {
      // Resolve ALL assigned locations
      const assignedIds = new Set<number>();
      if (user.locationId) assignedIds.add(user.locationId); // Legacy
      if (user.locationIds) user.locationIds.forEach(id => assignedIds.add(id)); // New Multi-location

      const userLocations = locations.filter(l => assignedIds.has(l.id));

      // Default settings
      const strictGeo = user.attendanceConfig?.restrictGeo ?? false;
      const strictIp = user.attendanceConfig?.restrictIp ?? false;

      // If NO restrictions are enabled, we allow.
      if (!strictGeo && !strictIp && user.attendanceConfig?.restriction === 'NONE') {
        // Free Access
      } else {
        // Perform Validation - Check if potentially valid in ANY of the assigned locations
        let isGeoValid = false;
        let isIpValid = false;
        let validationDebug: string[] = [];

        // Loop through all locations to find a match
        // If user has NO locations but strictGeo is ON -> fail
        if (userLocations.length === 0 && strictGeo) {
          validationDebug.push("Sem Locais Atribuídos");
        }

        // A) Geo Validation (Workplace)
        if (coords) {
          // Check against any assigned location
          for (const loc of userLocations) {
            if (loc.coordinates) {
              const dist = getDistanceFromLatLonInMeters(coords.lat, coords.lng, loc.coordinates.lat, loc.coordinates.lng);
              const radius = loc.coordinates.radius || 750;
              if (dist <= radius) {
                isGeoValid = true;
                validationDebug.push(`GPS OK: ${loc.name} (${Math.round(dist)}m)`);
                break; // Found a valid location
              } else {
                // validationDebug.push(`GPS Fora: ${loc.name} (${Math.round(dist)}m)`);
              }
            }
          }
          if (!isGeoValid && userLocations.length > 0) {
            validationDebug.push(`GPS Fora de todos os locais`);
          }
        } else if (!coords && strictGeo) {
          validationDebug.push("GPS Não detetado");
        }

        // B) IP Validation
        // Collect all allowed IPs from all locations + user config
        const validIps = new Set<string>();
        if (user.attendanceConfig?.allowedIps) user.attendanceConfig.allowedIps.forEach(ip => validIps.add(ip.trim()));
        userLocations.forEach(loc => {
          if (loc.allowedIps) loc.allowedIps.split(',').forEach(ip => validIps.add(ip.trim()));
        });

        if (!ipError && validIps.size > 0) {
          if (validIps.has(entryIp)) {
            isIpValid = true;
            validationDebug.push('IP OK');
          } else {
            validationDebug.push(`IP ${entryIp} não listado`);
          }
        }

        // C) Remote Work Exception (Home Validation) - Counts as valid Geo
        const isRemote = user.attendanceConfig?.isRemote;
        if (isRemote && user.attendanceConfig?.homeCoordinates) {
          const home = user.attendanceConfig.homeCoordinates;
          if (coords) {
            const distHome = getDistanceFromLatLonInMeters(coords.lat, coords.lng, home.lat, home.lng);
            const radiusHome = home.radius || 750;
            if (distHome <= radiusHome) {
              isGeoValid = true;
              validationDebug.push('GPS Casa OK');
              locationName += ' (Remoto/Casa)';
            }
          }
        }

        // D) STRICT DECISION
        let denyReason = '';

        // Combined Check: Valid Location = GPS OK OR IP match (Backup) OR Fallback Authorization
        const isLocationVerified = isGeoValid || isIpValid || isFallbackAuthorized;

        // 1. Check Geo Restriction
        if (strictGeo && !isLocationVerified) {
          denyReason += 'Geolocalização fora do permitido. ';
        }

        // 2. Check IP Restriction (Only if IPs are defined)
        // User rule: "if toggle off, no verification".
        // User rule: "if no IPs defined, only geo verification".
        const hasDefinedIps = validIps.size > 0;
        if (strictIp && hasDefinedIps && !isIpValid) {
          denyReason += 'IP não autorizado. ';
        }

        if (denyReason) {
          addToast('error', `Acesso Negado: ${denyReason} (${validationDebug.join(' | ')})`);
          return;
        }

        // If Strict Geo is OFF but IP is OFF, valid? Yes.
      }
    }

    // Insert to DB
    const dbLog = {
      user_id: user.id,
      date: todayStr,
      check_in: timeStr,
      status: status,
      check_in_location: locationName,
      check_in_ip: entryIp === 'Error/Offline' ? null : entryIp,
      check_in_coordinates: coords
    };

    const { data, error } = await supabase.from('time_logs').insert(dbLog).select().single();

    if (error || !data) {
      console.error("Clock In Error:", error);
      addToast('error', `Erro BD (Entrada): ${error?.message || 'Desconhecido'}`);
      return;
    }

    // 4. REGISTER ANOMALY (If Late)
    if (status === TimeLogStatus.LATE && anomalyMinutes > 0 && data?.id) {
      // Only critical delays (>= 30min) require justification
      const isCritical = anomalyMinutes >= 30;
      const anomalyStatus = isCritical ? 'AWAITING_JUSTIFICATION' : 'PENDING';

      const { error: anomalyError, data: anomalyData } = await supabase.from('anomalies').insert({
        user_id: numericId, // USE RESOLVED NUMERIC ID
        time_log_id: data.id,
        type: 'LATE_ENTRY',
        minutes: anomalyMinutes,
        status: anomalyStatus,
        created_at: new Date().toISOString()
      }).select().single();

      if (anomalyError) console.error("Error creating anomaly:", anomalyError);

      if (isCritical && !anomalyError && anomalyData) {
        // Send notification to employee
        const employeeMessage = {
          sender_id: currentUser?.id || 'SYSTEM',
          receiver_id: numericId, // USE RESOLVED NUMERIC ID
          subject: `Justificação de Atraso Requerida`,
          content: `Foi registado um atraso de ${anomalyMinutes} minutos na sua entrada de hoje (${todayStr}). Sendo um atraso crítico, por favor aceda ao seu perfil para submeter uma justificação.`,
          date: new Date().toISOString(),
          read: false,
          priority: 'HIGH'
        };
        await supabase.from('internal_messages').insert(employeeMessage);

        // Add to local state
        setAnomalies(prev => [{
          id: anomalyData.id,
          userId: anomalyData.user_id,
          timeLogId: anomalyData.time_log_id,
          type: anomalyData.type,
          minutes: anomalyData.minutes,
          status: anomalyData.status,
          managerId: anomalyData.manager_id,
          managerNotes: anomalyData.manager_notes,
          employeeJustification: anomalyData.employee_justification,
          createdAt: anomalyData.created_at
        }, ...prev]);

        addToast('warning', `Atraso crítico (${anomalyMinutes}min). Foi pedida justificação.`);
      }
    }

    const newLog: TimeLog = {
      id: data.id,
      userId: user.id,
      date: todayStr,
      checkIn: timeStr,
      status: status,
      checkInLocation: locationName,
      checkInIp: entryIp === 'Error/Offline' ? null : entryIp,
      checkInCoordinates: coords || undefined
    };

    setTimeLogs(prev => [newLog, ...prev]);
    addToast(status === TimeLogStatus.LATE ? 'warning' : 'success',
      status === TimeLogStatus.LATE
        ? `Entrada registada com atraso (${anomalyMinutes}min).`
        : `Bem-vindo, ${user.name.split(' ')[0]}. Entrada: ${timeStr}`
    );
  };

  const handleBreakStart = async (user: User) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const currentLog = timeLogs.find(l => String(l.userId) === String(user.id) && !l.checkOut);
    if (!currentLog) {
      addToast('error', 'Não foi encontrado um registo de entrada aberto para iniciar a pausa.');
      return;
    }

    if (currentLog.breakStart) {
      addToast('warning', 'Pausa já iniciada.');
      return;
    }

    const { error } = await supabase.from('time_logs').update({
      break_start: timeStr
    }).eq('id', currentLog.id);

    if (error) {
      console.error("Break Start Error:", error);
      addToast('error', 'Erro ao registar início de pausa.');
      return;
    }

    setTimeLogs(prev => prev.map(log => log.id === currentLog.id ? { ...log, breakStart: timeStr } : log));
    addToast('success', `Pausa iniciada às ${timeStr}. Bom descanso!`);
  };

  const handleBreakEnd = async (user: User) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const currentLog = timeLogs.find(l => String(l.userId) === String(user.id) && !l.checkOut);
    if (!currentLog) {
      addToast('error', 'Não foi encontrado um registo de entrada aberto para terminar a pausa.');
      return;
    }

    if (!currentLog.breakStart) {
      addToast('error', 'Pausa não iniciada.');
      return;
    }

    if (currentLog.breakEnd) {
      addToast('warning', 'Pausa já terminada.');
      return;
    }

    const { error } = await supabase.from('time_logs').update({
      break_end: timeStr
    }).eq('id', currentLog.id);

    if (error) {
      console.error("Break End Error:", error);
      addToast('error', 'Erro ao registar fim de pausa.');
      return;
    }

    setTimeLogs(prev => prev.map(log => log.id === currentLog.id ? { ...log, breakEnd: timeStr } : log));
    addToast('success', `Pausa terminada às ${timeStr}. Bom regresso!`);
  };

  const handleClockOut = async (user: User) => {
    // 0. SECURITY: Resolve Numeric ID
    const numericId = await resolveNumericUserId(user.id, user.email);
    if (!numericId) {
      addToast('error', 'Erro crítico: Não foi possível validar o seu identificador de utilizador.');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // Find the log to update
    const currentLog = timeLogs.find(l => String(l.userId) === String(numericId) && !l.checkOut);

    if (currentLog) {
      // Re-assign user to ensure numeric ID is used throughout the handler
      user = { ...user, id: numericId };
      let hours = 0;
      let breakStartStr = currentLog.breakStart;
      let breakEndStr = currentLog.breakEnd;

      if (currentLog.checkIn) {
        // Build Date objects for robust cross-day math
        const checkInDate = new Date(`${currentLog.date}T${currentLog.checkIn}${currentLog.checkIn.split(':').length === 2 ? ':00' : ''}`);
        let checkOutDate = new Date(now);
        // Ensure accurate checkout date string if the shift crossed days, by using actual logic
        const checkOutDateStr = checkOutDate.toISOString().split('T')[0];

        let rawHours = (checkOutDate.getTime() - checkInDate.getTime()) / 3600000;

        // Calculate break duration
        if (breakStartStr && breakEndStr) {
          // If break started before checkIn (e.g. strange manual entry) or crossed midnight
          // For simplicity we assume breaks happen on the same day they started,
          // but if they cross midnight, we handle it too.

          let bStartDate = new Date(`${currentLog.date}T${breakStartStr}${breakStartStr.split(':').length === 2 ? ':00' : ''}`);
          let bEndDate = new Date(`${currentLog.date}T${breakEndStr}${breakEndStr.split(':').length === 2 ? ':00' : ''}`);

          // If break end time is smaller than break start time, it crossed midnight.
          if (bEndDate < bStartDate) {
            bEndDate.setDate(bEndDate.getDate() + 1);
          }

          const bDuration = (bEndDate.getTime() - bStartDate.getTime()) / 3600000;
          rawHours -= bDuration;
        } else if (user.scheduleTemplateId) {
          // Automatic Lunch Mirroring (Fallback if they didn't manually punch breaks)
          const tmpl = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);
          // Reuse 'now' from outer scope
          const daySched = getEffectiveScheduleDay(now, user, tmpl);

          if (daySched?.breakStart && daySched?.breakEnd) {
            const [bsH, bsM] = daySched.breakStart.split(':').map(Number);
            const [beH, beM] = daySched.breakEnd.split(':').map(Number);
            const bStartVal = bsH + bsM / 60;
            let bEndVal = beH + beM / 60;
            if (bEndVal < bStartVal) bEndVal += 24; // Crossed midnight within the break template

            const [cH, cM] = currentLog.checkIn.split(':').map(Number);
            const checkInVal = cH + cM / 60;

            const [coH, coM] = timeStr.split(':').map(Number);
            let checkOutVal = coH + coM / 60;
            if (checkOutVal < checkInVal) checkOutVal += 24; // Entire shift crossed midnight

            // If worked through the break (started before/at break start, ended after/at break end)
            if (checkInVal <= bStartVal && checkOutVal >= bEndVal) {
              const bDuration = bEndVal - bStartVal;
              rawHours -= bDuration;
              breakStartStr = daySched.breakStart;
              breakEndStr = daySched.breakEnd;
            }
          }
        }
        hours = rawHours > 0 ? rawHours : 0;
      }

      // 1. Fetch IP checks
      let exitIp = 'Unknown';
      let ipError = false;
      try {
        // Primary Service
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        exitIp = ipData.ip;
      } catch (e) {
        console.warn("Primary IP fetch failed, trying fallback...", e);
        try {
          // Fallback Service
          const fallbackRes = await fetch('https://ipapi.co/json/');
          const fallbackData = await fallbackRes.json();
          exitIp = fallbackData.ip;
        } catch (e2) {
          console.warn("All IP fetches failed.", e2);
          exitIp = 'Error/Offline';
          ipError = true;
        }
      }

      // 2. Fetch Geo
      let coords: { lat: number; lng: number } | null = null;
      let exitLocation = '';
      let isFallbackAuthorized = false;

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: false, 
            timeout: 10000,
            maximumAge: 120000 
          });
        });
        coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        exitLocation = `GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      } catch (error) {
        console.warn('[Geolocation] GPS failed during checkout, checking fallback:', error);
        
        const strictGeo = user.attendanceConfig?.restrictGeo ?? false;
        const allAllowedIps = new Set<string>();
        if (user.locationId) {
          const loc = locations.find(l => l.id === user.locationId);
          if (loc?.allowedIps) loc.allowedIps.split(',').forEach(ip => allAllowedIps.add(ip.trim()));
        }
        if (user.locationIds) {
          user.locationIds.forEach(lid => {
            const loc = locations.find(l => l.id === lid);
            if (loc?.allowedIps) loc.allowedIps.split(',').forEach(ip => allAllowedIps.add(ip.trim()));
          });
        }

        if (!ipError && allAllowedIps.size > 0 && allAllowedIps.has(exitIp)) {
          exitLocation = 'Validação por IP';
          isFallbackAuthorized = true;
        } else if (!strictGeo) {
          exitLocation = 'Localização indisponível (Autorizado)';
          isFallbackAuthorized = true;
        } else {
          addToast('error', `Falha Geo (Saída): Restrição Ativa. GPS: ${coords ? 'OK' : 'Falhou'}`);
          return;
        }
      }

      // 3. VALIDATION (Same as Entry)
      const hasLocationCheck = (user.locationIds && user.locationIds.length > 0) || user.locationId;

      if (hasLocationCheck) {
        // Resolve ALL assigned locations
        const assignedIds = new Set<number>();
        if (user.locationId) assignedIds.add(user.locationId);
        if (user.locationIds) user.locationIds.forEach(id => assignedIds.add(id));

        const userLocations = locations.filter(l => assignedIds.has(l.id));

        // Check for "Free Access"
        if (user.attendanceConfig?.restriction === 'NONE') {
          // Free Access - Valid
        } else {
          // Default settings
          const strictGeo = user.attendanceConfig?.restrictGeo ?? false;
          const strictIp = user.attendanceConfig?.restrictIp ?? false;

          let isGeoValid = false;
          let isIpValid = false;
          let validationDebug: string[] = [];

          if (userLocations.length === 0) {
            validationDebug.push("Sem Locais");
          }

          // A) Geo (Workplace)
          if (coords) {
            for (const loc of userLocations) {
              if (loc.coordinates) {
                const dist = getDistanceFromLatLonInMeters(coords.lat, coords.lng, loc.coordinates.lat, loc.coordinates.lng);
                const radius = loc.coordinates.radius || 750;
                if (dist <= radius) {
                  isGeoValid = true;
                  validationDebug.push(`GPS OK: ${loc.name}`);
                  break;
                }
              }
            }
            if (!isGeoValid) validationDebug.push('GPS Fora');
          } else {
            validationDebug.push('GPS N/A');
          }

          // B) IP
          // Collect valid IPs
          const validIps = new Set<string>();
          userLocations.forEach(loc => {
            if (loc.allowedIps) loc.allowedIps.split(',').forEach(ip => validIps.add(ip.trim()));
          });
          if (!ipError && validIps.size > 0) {
            if (validIps.has(exitIp)) {
              isIpValid = true;
              validationDebug.push('IP OK');
            } else {
              validationDebug.push(`IP Inválido`);
            }
          }

          // C) Remote Work (Home)
          const isRemote = user.attendanceConfig?.isRemote;
          if (isRemote && user.attendanceConfig?.homeCoordinates) {
            const home = user.attendanceConfig.homeCoordinates;
            if (coords) {
              const distHome = getDistanceFromLatLonInMeters(coords.lat, coords.lng, home.lat, home.lng);
              const radiusHome = home.radius || 750;
              if (distHome <= radiusHome) {
                isGeoValid = true;
                validationDebug.push('GPS Casa OK');
                exitLocation += ' (Remoto/Casa)';
              } else {
                validationDebug.push(`GPS Casa Fora (${Math.round(distHome)}m)`);
              }
            }
          }

          // 3. VALIDATION (Same as Entry)
          if (!isGeoValid && !isIpValid && !isFallbackAuthorized) {
            // Check if we should block
            const isLocationVerified = isGeoValid || isIpValid || isFallbackAuthorized;

            // 1. Check Geo Restriction
            if (strictGeo && !isLocationVerified) {
              addToast('error', `Não pode registar a saída fora do local de trabalho. ${validationDebug.join(' | ')}`);
              return;
            }

            // 2. Check IP Restriction
            const hasDefinedIps = validIps.size > 0;
            if (strictIp && hasDefinedIps && !isIpValid) {
              addToast('error', `IP não autorizado para registar saída.`);
              return;
            }
          } else {
            // Even if one is valid, check Strict IP Rule
            const hasDefinedIps = validIps.size > 0;
            if (strictIp && hasDefinedIps && !isIpValid) {
              addToast('error', `IP não autorizado para registar saída.`);
              return;
            }
          }
        }
      }

      // Update DB
      const { error } = await supabase
        .from('time_logs')
        .update({
          check_out: timeStr,
          total_hours: hours,
          break_start: breakStartStr,
          break_end: breakEndStr,
          check_out_location: exitLocation,
          check_out_ip: exitIp === 'Error/Offline' ? null : exitIp,
          check_out_coordinates: coords
        })
        .eq('id', currentLog.id);

      if (error) {
        console.error("Clock Out Error:", error);
        addToast('error', `Erro BD (Saída): ${error.message || 'Desconhecido'}`);
        return;
      }

      // Update Local
      setTimeLogs(prev => prev.map(log =>
        log.id === currentLog.id ? {
          ...log,
          checkOut: timeStr,
          totalHours: hours,
          breakStart: breakStartStr,
          breakEnd: breakEndStr,
          checkOutLocation: exitLocation,
          checkOutIp: exitIp === 'Error/Offline' ? null : exitIp,
          checkOutCoordinates: coords || undefined
        } : log
      ));

      // ANOMALY CHECK
      const isFlexibleUser = user.attendanceConfig?.flexibleSchedule === true;

      if (isFlexibleUser) {
        // FLEXIBLE SCHEDULE: Compare total hours vs minimum required
        const minHours = user.attendanceConfig?.minimumDailyHours ?? 8;
        const diffMinutes = Math.round((hours - minHours) * 60);

        if (diffMinutes < 0) {
          // DEFICIT: worked less than required
          const deficitMinutes = Math.abs(diffMinutes);
          const isCritical = deficitMinutes >= 15;
          const anomalyStatus = isCritical ? 'AWAITING_JUSTIFICATION' : 'PENDING';

          const { error: anomalyError, data: anomalyData } = await supabase.from('anomalies').insert({
            user_id: numericId, // USE RESOLVED NUMERIC ID
            time_log_id: currentLog.id,
            type: 'HOURS_DEFICIT',
            minutes: deficitMinutes,
            status: anomalyStatus,
            created_at: new Date().toISOString()
          }).select().single();

          if (anomalyError) console.error("Error creating deficit anomaly:", anomalyError);

          if (isCritical && !anomalyError && anomalyData) {
            const employeeMessage = {
              sender_id: currentUser?.id || 'SYSTEM',
              receiver_id: numericId, // USE RESOLVED NUMERIC ID
              subject: `Justificação de Défice de Horas Requerida`,
              content: `Foi registado um défice de ${deficitMinutes} minutos no seu horário flexível do dia ${new Date(currentLog.date).toLocaleDateString('pt-PT')}. Sendo um défice crítico, por favor aceda ao seu perfil para submeter uma justificação.`,
              date: new Date().toISOString(),
              read: false,
              priority: 'HIGH'
            };
            await supabase.from('internal_messages').insert(employeeMessage);

            // Add to local state
            setAnomalies(prev => [{
              id: anomalyData.id,
              userId: anomalyData.user_id,
              timeLogId: anomalyData.time_log_id,
              type: anomalyData.type,
              minutes: anomalyData.minutes,
              status: anomalyData.status,
              managerId: anomalyData.manager_id,
              managerNotes: anomalyData.manager_notes,
              employeeJustification: anomalyData.employee_justification,
              createdAt: anomalyData.created_at
            }, ...prev]);
          }

          const h = Math.floor(hours);
          const m = Math.round((hours - h) * 60);
          addToast('warning', `Trabalhou ${h}h${m > 0 ? m + 'm' : ''}. Défice: ${deficitMinutes} min.${isCritical ? ' Justificação pedida.' : ''}`);
        } else if (diffMinutes > 0) {
          // SURPLUS: worked more than required (hour bank credit)
          const { error: anomalyError } = await supabase.from('anomalies').insert({
            user_id: numericId, // USE RESOLVED NUMERIC ID
            time_log_id: currentLog.id,
            type: 'HOURS_SURPLUS',
            minutes: diffMinutes,
            status: 'pending',
            created_at: new Date().toISOString()
          });
          if (anomalyError) console.error("Error creating surplus anomaly:", anomalyError);
          const h = Math.floor(hours);
          const m = Math.round((hours - h) * 60);
          addToast('success', `Até amanhã! Trabalhou ${h}h${m > 0 ? m + 'm' : ''}. Excedente: +${diffMinutes} min.`);
        } else {
          addToast('success', `Até amanhã! Saída: ${timeStr}`);
        }
      } else {
        // FIXED SCHEDULE: Check early exit as before
        // 1. Determine Expected End Time
        let expectedEnd = user.workEndTime;
        if (user.scheduleTemplateId) {
          const tmpl = scheduleTemplates.find(t => t.id === user.scheduleTemplateId);
          if (tmpl) {
            const daySched = getEffectiveScheduleDay(new Date(), user, tmpl);
            if (daySched && !daySched.isOff) {
              expectedEnd = daySched.end;
            }
          }
        }

        // 2. Check Tolerance
        if (expectedEnd) {
          const checkOutMins = getMinutesFromTime(timeStr);
          const endMins = getMinutesFromTime(expectedEnd);
          const userLocation = locations.find(l => l.id === user.locationId);
          const toleranceExit = userLocation?.toleranceExit ?? 30;

          if (checkOutMins < endMins - toleranceExit) {
            // EARLY EXIT
            const diff = endMins - checkOutMins;
            const isCritical = diff >= 30;
            const anomalyStatus = isCritical ? 'AWAITING_JUSTIFICATION' : 'PENDING';

            const { error: anomalyError, data: anomalyData } = await supabase.from('anomalies').insert({
              user_id: numericId, // USE RESOLVED NUMERIC ID
              time_log_id: currentLog.id,
              type: 'EARLY_EXIT',
              minutes: diff,
              status: anomalyStatus,
              created_at: new Date().toISOString()
            }).select().single();

            if (anomalyError) console.error("Error creating anomaly:", anomalyError);

            if (isCritical && !anomalyError && anomalyData) {
              const employeeMessage = {
                sender_id: currentUser?.id || 'SYSTEM',
                receiver_id: numericId, // USE RESOLVED NUMERIC ID
                subject: `Justificação de Saída Antecipada Requerida`,
                content: `Foi registada uma saída antecipada de ${diff} minutos no dia ${new Date(currentLog.date).toLocaleDateString('pt-PT')}. Sendo uma anomalia crítica, por favor aceda ao seu perfil para submeter uma justificação.`,
                date: new Date().toISOString(),
                read: false,
                priority: 'HIGH'
              };
              await supabase.from('internal_messages').insert(employeeMessage);

              // Add to local state
              setAnomalies(prev => [{
                id: anomalyData.id,
                userId: anomalyData.user_id,
                timeLogId: anomalyData.time_log_id,
                type: anomalyData.type,
                minutes: anomalyData.minutes,
                status: anomalyData.status,
                managerId: anomalyData.manager_id,
                managerNotes: anomalyData.manager_notes,
                employeeJustification: anomalyData.employee_justification,
                createdAt: anomalyData.created_at
              }, ...prev]);
            }

            addToast('warning', `Saída antecipada registada (${diff}min).${isCritical ? ' Justificação pedida.' : ''}`);
          } else {
            addToast('success', `Até amanhã! Saída: ${timeStr}`);
          }
        } else {
          addToast('success', `Até amanhã! Saída: ${timeStr}`);
        }
      }


    } else {
      addToast('error', 'Saída não registada: Não foi encontrado um turno aberto para hoje. Se tem um turno pendente, limpe a cache ou contacte admin.');
    }
  };

  const handleSendMessage = async (m: InternalMessage[]) => {
    // Batch insert not supported directly in this simple logic, loop or standard insert
    // Assuming 'm' is an array of messages generated by the UI (e.g. broadcasting)

    const dbMessages = m.map(msg => ({
      sender_id: msg.senderId === 'SYSTEM' ? null : msg.senderId, // Handle SYSTEM sender ID
      sender_name: msg.senderName,
      receiver_id: msg.receiverId,
      subject: msg.subject,
      content: msg.content,
      date: msg.date,
      read: msg.read,
      priority: msg.priority
    }));

    const { data, error } = await supabase.from('internal_messages').insert(dbMessages).select();

    if (error || !data) {
      console.error("Message Error:", error);
      addToast('error', 'Erro ao enviar mensagem.');
      return;
    }

    // Update local state with real IDs
    const newMessages = data.map((d: any) => ({
      id: d.id,
      senderId: d.sender_id || 'SYSTEM',
      senderName: d.sender_name,
      receiverId: d.receiver_id,
      subject: d.subject,
      content: d.content,
      date: d.date,
      read: d.read,
      priority: d.priority
    }));

    setMessages(prev => [...newMessages, ...prev]);

    // Notify recipients
    for (const msg of newMessages) {
      emitNotification({
        userId: typeof msg.receiverId === 'string' ? Number(msg.receiverId) : msg.receiverId,
        type: 'MESSAGE_RECEIVED',
        title: 'Nova Mensagem',
        description: `${msg.senderName}: ${msg.subject}`,
        severity: 'info',
        referenceId: msg.id,
        referenceTable: 'internal_messages',
        actionUrl: '/portal/messages',
      });
    }
  };

  const handleMarkMessageRead = async (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    const { error } = await supabase.from('internal_messages').update({ read: true }).eq('id', id);
    if (error) {
      console.error("Error marking message read:", error);
      addToast('error', 'Erro ao marcar mensagem como lida.');
    }
  };

  const handleAddLock = async (year: number, month: number) => {
    const { data, error } = await supabase.from('locked_months').insert({ year, month, is_locked: true }).select().single();
    if (error || !data) {
      addToast('error', 'Erro ao bloquear mês.');
      return;
    }
    setLockedMonths(prev => [...prev, { id: data.id, year, month, isLocked: true }]);
    addToast('success', `Mês ${month}/${year} bloqueado.`);
  };

  const handleDeleteLock = async (id: number) => {
    const { error } = await supabase.from('locked_months').delete().eq('id', id);
    if (error) {
      addToast('error', 'Erro ao desbloquear mês.');
      return;
    }
    setLockedMonths(prev => prev.filter(l => l.id !== id));
    addToast('success', 'Mês desbloqueado.');
  };

  const handleAddRole = async (name: string) => {
    const { data, error } = await supabase.from('job_roles').insert({ name }).select().single();
    if (error || !data) {
      addToast('error', 'Erro ao adicionar cargo.');
      return;
    }
    setJobRoles(prev => [...prev, { id: data.id, name }]);
    addToast('success', 'Cargo adicionado.');
  };

  const handleDeleteRole = async (id: number) => {
    const { error } = await supabase.from('job_roles').delete().eq('id', id);
    if (error) {
      addToast('error', 'Erro ao remover cargo.');
      return;
    }
    setJobRoles(prev => prev.filter(r => r.id !== id));
    addToast('success', 'Cargo removido.');
  };

  const handleAddHoliday = async (date: string, name: string, type: 'National' | 'Local' | 'Optional') => {
    const year = new Date(date).getFullYear();
    const { data, error } = await supabase.from('holidays').insert({ date, name, type, year }).select().single();
    if (error || !data) {
      addToast('error', 'Erro ao adicionar feriado.');
      return;
    }
    setHolidays(prev => [...prev, { id: data.id, date, name, type, year }]);
    addToast('success', 'Feriado adicionado.');
  };

  const handleDeleteHoliday = async (id: number) => {
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) {
      addToast('error', 'Erro ao remover feriado.');
      return;
    }
    setHolidays(prev => prev.filter(h => h.id !== id));
    addToast('success', 'Feriado removido.');
  };

  const handleAddDepartment = async (name: string) => {
    const { data, error } = await supabase.from('departments').insert({ name }).select().single();
    if (error || !data) {
      addToast('error', 'Erro ao adicionar departamento.');
      return;
    }
    setDepartments(prev => [...prev, { id: data.id, name }]);
    addToast('success', 'Departamento adicionado.');
  };

  const handleDeleteDepartment = async (id: number) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) {
      addToast('error', 'Erro ao remover departamento.');
      return;
    }
    setDepartments(prev => prev.filter(d => d.id !== id));
    addToast('success', 'Departamento removido.');
  };

  const handleAddAnomalyType = async (data: Omit<AnomalyType, 'id' | 'createdAt'>) => {
    const dbData = {
      name: data.name,
      is_justified: data.isJustified,
      type: data.type,
      rh_code: data.rhCode,
      status: data.status
    };
    const { data: newData, error } = await supabase.from('anomaly_types').insert(dbData).select().single();
    if (error || !newData) {
      console.error("Error adding anomaly type:", error);
      addToast('error', 'Erro ao adicionar tipo de anomalia.');
      return;
    }
    setAnomalyTypes(prev => [...prev, {
      id: newData.id,
      name: newData.name,
      isJustified: newData.is_justified,
      type: newData.type,
      rhCode: newData.rh_code,
      status: newData.status,
      createdAt: newData.created_at
    }]);
    addToast('success', 'Tipo de anomalia criado.');
  };

  // --- LOCATION HANDLERS ---
  const handleAddLocation = async (loc: Location): Promise<boolean> => {
    // Validate Session
    // Strict Session Check Removed for Emergency Stability
    // const { data: { session } } = await supabase.auth.getSession();
    // if (!session) {
    //   addToast('error', 'Sessão expirada ou inválida. Por favor faça login novamente.');
    //   return false;
    // }

    // Correctly map all fields from frontend CamelCaseSchema to DB snake_case schema
    const rawPayload: Record<string, any> = {
      name: loc.name,
      address: loc.address,
      observations: loc.observations,
      locality: loc.locality,
      postal_code: loc.postalCode,
      mobile: loc.mobile,
      phone: loc.phone,
      email: loc.email,
      tolerance_entry: loc.toleranceEntry,
      tolerance_exit: loc.toleranceExit,
      block_entry: loc.blockEntry,
      block_exit: loc.blockExit,
      allowed_ips: loc.allowedIps,
      notification_emails: loc.notificationEmails,
      status: loc.status,
      // CRITICAL MISSING FIELDS ADDED:
      coordinates: loc.coordinates,
      extra_hours_start: loc.extraHoursStart,
      missing_hours_start: loc.missingHoursStart,
      count_extra_after_exit: loc.countExtraAfterExit,
      timezone: loc.timezone
    };

    // Remove undefined/null keys
    const dbLoc = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined && v !== null)
    );

    const { data, error } = await supabase.from('locations').insert(dbLoc).select().single();

    if (error || !data) {
      console.error("DB Insert failed details:", error);
      const errorMsg = error?.message || 'Erro desconhecido';

      addToast('error', `Erro ao gravar local: ${errorMsg}`);
      return false;
    }

    const newLoc: Location = {
      ...loc,
      id: data.id,
      createdAt: data.created_at
    };
    setLocations(prev => [...prev, newLoc]);
    addToast('success', 'Local criado com sucesso.');
    return true;
  };

  const handleUpdateLocation = async (loc: Location): Promise<boolean> => {
    const rawPayload: Record<string, any> = {
      name: loc.name,
      address: loc.address,
      observations: loc.observations,
      locality: loc.locality,
      postal_code: loc.postalCode,
      mobile: loc.mobile,
      phone: loc.phone,
      email: loc.email,
      tolerance_entry: loc.toleranceEntry,
      tolerance_exit: loc.toleranceExit,
      block_entry: loc.blockEntry,
      block_exit: loc.blockExit,
      allowed_ips: loc.allowedIps,
      notification_emails: loc.notificationEmails,
      status: loc.status,
      coordinates: loc.coordinates,
      extra_hours_start: loc.extraHoursStart,
      missing_hours_start: loc.missingHoursStart,
      count_extra_after_exit: loc.countExtraAfterExit,
      timezone: loc.timezone
    };

    // Remove undefined/null keys
    const dbLoc = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined && v !== null)
    );

    const { error } = await supabase.from('locations').update(dbLoc).eq('id', loc.id);

    if (error) {
      addToast('error', `Erro ao atualizar local: ${error.message}`);
      return false;
    }

    setLocations(prev => prev.map(l => l.id === loc.id ? loc : l));
    addToast('success', 'Local atualizado com sucesso.');
    return true;
  };

  const handleUpdateAnomaly = async (anomaly: Anomaly, silent: boolean = false) => {
    // Optimistic update
    setAnomalies(prev => prev.map(a => a.id === anomaly.id ? anomaly : a));

    const { error } = await supabase.from('anomalies').update({
      status: anomaly.status,
      manager_id: anomaly.managerId,
      manager_notes: anomaly.managerNotes,
      employee_justification: anomaly.employeeJustification
    }).eq('id', anomaly.id);

    if (error) {
      console.error("Error updating anomaly:", error);
      if (!silent) {
        addToast('error', 'Erro ao atualizar anomalia.');
      }
    } else {
      // Only show toast for manual updates (not auto-created anomalies)
      if (!silent) {
        addToast('success', 'Anomalia atualizada.');
      }

      // Notify employee about anomaly requiring justification
      if (anomaly.status === 'AWAITING_JUSTIFICATION') {
        emitNotification({
          userId: anomaly.userId,
          type: 'ANOMALY_CREATED',
          title: 'Anomalia Registada',
          description: 'Foi registada uma anomalia no seu registo. Por favor justifique.',
          severity: 'warning',
          referenceId: anomaly.id,
          referenceTable: 'anomalies',
          actionUrl: '/portal/profile',
        });
      }
      // Notify admins when escalated to HR
      if (anomaly.status === 'ESCALATED_HR') {
        const adminIds = users.filter((u: User) => u.role === 'ADMIN' || u.role === 'Administrador').map((u: User) => u.id);
        emitNotificationBulk(adminIds, {
          type: 'ANOMALY_ESCALATED',
          title: 'Anomalia Escalada para RH',
          description: `Uma anomalia foi escalada para revisão dos RH.`,
          severity: 'warning',
          referenceId: anomaly.id,
          referenceTable: 'anomalies',
          actionUrl: '/admin/absences',
        });
      }
    }
  };



  const handleDeleteAnomalyType = async (id: number) => {
    const { error } = await supabase.from('anomaly_types').delete().eq('id', id);
    if (error) {
      addToast('error', 'Erro ao remover anomalia.');
      return;
    }
    setAnomalyTypes(prev => prev.filter(a => a.id !== id));
    addToast('success', 'Anomalia removida.');
  };

  const handleUpdateAnomalyType = async (anomalyType: AnomalyType) => {
    const dbData = {
      name: anomalyType.name,
      is_justified: anomalyType.isJustified,
      type: anomalyType.type,
      rh_code: anomalyType.rhCode,
      status: anomalyType.status
    };
    const { error } = await supabase.from('anomaly_types').update(dbData).eq('id', anomalyType.id);
    if (error) {
      addToast('error', 'Erro ao atualizar tipo de anomalia.');
      return;
    }
    setAnomalyTypes(prev => prev.map(a => a.id === anomalyType.id ? anomalyType : a));
    addToast('success', 'Tipo de anomalia atualizado.');
  };

  const handleDeleteLocation = async (id: number): Promise<boolean> => {
    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) {
      console.error("DB Delete failed", error);
      addToast('error', `Erro ao apagar local: ${error.message}`);
      return false;
    }

    setLocations(prev => prev.filter(l => l.id !== id));
    addToast('success', 'Local apagado com sucesso.');
    return true;
  };

  const handleUpdateDepartment = async (dept: Department) => {
    // FIX: Update both name and manager, not just manager
    const { error } = await supabase.from('departments').update({
      name: dept.name,
      manager_id: dept.managerId
    }).eq('id', dept.id);

    if (error) {
      console.error("DB Dept Update failed", error);
      addToast('error', 'Erro ao atualizar departamento.');
      return;
    }

    setDepartments(prev => prev.map(d => d.id === dept.id ? dept : d));
    addToast('success', 'Departamento atualizado com sucesso.');
  };

  // --- SCHEDULE PERIOD HANDLERS ---
  const handleAddPeriod = async (period: SchedulePeriod) => {
    const dbPeriod = {
      name: period.name,
      typology: period.typology,
      affected_schedules: period.affectedSchedules,
      deduct_hours: period.deductHours,
      excel_code: period.excelCode,
      color: period.color,
      lines: period.lines
    };

    const { data, error } = await supabase.from('schedule_periods').insert(dbPeriod).select().single();
    if (error || !data) {
      console.warn("DB Insert failed or mocked.", error);
      setSchedulePeriods(prev => [...prev, period]);
      return;
    }

    setSchedulePeriods(prev => [...prev, { ...period, id: data.id, createdAt: data.created_at }]);
  };

  const handleUpdatePeriod = async (period: SchedulePeriod) => {
    const dbPeriod = {
      name: period.name,
      typology: period.typology,
      affected_schedules: period.affectedSchedules,
      deduct_hours: period.deductHours,
      excel_code: period.excelCode,
      color: period.color,
      lines: period.lines
    };

    const { error } = await supabase.from('schedule_periods').update(dbPeriod).eq('id', period.id);
    if (error) console.warn("DB Update failed", error);

    setSchedulePeriods(prev => prev.map(p => p.id === period.id ? period : p));
  };

  const handleDeletePeriod = async (id: number) => {
    const { error } = await supabase.from('schedule_periods').delete().eq('id', id);
    if (error) console.warn("DB Delete failed", error);
    setSchedulePeriods(prev => prev.filter(p => p.id !== id));
  };

  // --- SCHEDULE TEMPLATE HANDLERS ---
  const handleAddScheduleTemplate = async (template: ScheduleTemplate) => {
    const dbTemplate = {
      name: template.name,
      weekly_pattern: template.weeklyPattern,
      cycle_days: template.cycleDays,
      cycle_pattern: template.cyclePattern,
      total_weekly_hours: template.totalWeeklyHours
    };
    const { data, error } = await supabase.from('schedule_templates').insert(dbTemplate).select().single();
    if (error || !data) {
      console.warn("DB Insert failed", error);
      setScheduleTemplates(prev => [...prev, template]);
      addToast('warning', 'Modelo guardado localmente.');
      return;
    }
    setScheduleTemplates(prev => [...prev, { ...template, id: data.id, createdAt: data.created_at }]);
    addToast('success', 'Modelo de horário criado.');
  };

  const handleUpdateScheduleTemplate = async (template: ScheduleTemplate) => {
    const dbTemplate = {
      name: template.name,
      weekly_pattern: template.weeklyPattern,
      cycle_days: template.cycleDays,
      cycle_pattern: template.cyclePattern,
      total_weekly_hours: template.totalWeeklyHours
    };
    const { error } = await supabase.from('schedule_templates').update(dbTemplate).eq('id', template.id);
    if (error) console.warn("DB Update failed", error);
    setScheduleTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    addToast('success', 'Modelo de horário atualizado.');
  };

  const handleDeleteScheduleTemplate = async (id: number) => {
    const { error } = await supabase.from('schedule_templates').delete().eq('id', id);
    if (error) console.warn("DB Delete failed", error);
    setScheduleTemplates(prev => prev.filter(t => t.id !== id));
    addToast('success', 'Modelo de horário apagado.');
  };

  // --- LEAVE TYPE HANDLERS ---
  const handleAddLeaveType = async (leaveType: LeaveType) => {
    const dbLeaveType = {
      name: leaveType.name,
      color: leaveType.color,
      deducts_vacation: leaveType.deductsVacation,
      requires_approval: leaveType.requiresApproval
    };
    const { data, error } = await supabase.from('leave_types').insert(dbLeaveType).select().single();
    if (error || !data) {
      console.warn("DB Insert failed", error);
      setLeaveTypes(prev => [...prev, leaveType]);
      return;
    }
    setLeaveTypes(prev => [...prev, { ...leaveType, id: data.id, createdAt: data.created_at }]);
    addToast('success', 'Tipo de ausência criado.');
  };

  const handleUpdateLeaveType = async (leaveType: LeaveType) => {
    const dbLeaveType = {
      name: leaveType.name,
      color: leaveType.color,
      deducts_vacation: leaveType.deductsVacation,
      requires_approval: leaveType.requiresApproval
    };
    const { error } = await supabase.from('leave_types').update(dbLeaveType).eq('id', leaveType.id);
    if (error) console.warn("DB Update failed", error);
    setLeaveTypes(prev => prev.map(lt => lt.id === leaveType.id ? leaveType : lt));
    addToast('success', 'Tipo de ausência atualizado.');
  };

  const handleDeleteLeaveType = async (id: number) => {
    const { error } = await supabase.from('leave_types').delete().eq('id', id);
    if (error) console.warn("DB Delete failed", error);
    setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
    addToast('success', 'Tipo de ausência apagado.');
  };

  // --- LEAVE HANDLERS ---
  const handleAddLeave = async (leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Map status to database format (lowercase)
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'APPROVED': 'approved',
      'REJECTED': 'rejected'
    };

    const dbLeave: Record<string, any> = {
      user_id: leave.userId,
      leave_type_id: leave.leaveTypeId,
      start_date: leave.startDate,
      end_date: leave.endDate,
      status: statusMap[leave.status] || leave.status.toLowerCase(),
      notes: leave.notes || null,
    };
    // Optional approval workflow columns (may not exist in all DB setups)
    if (leave.approvalStep) dbLeave.approval_step = leave.approvalStep;
    if (leave.managerApprovalStatus) dbLeave.manager_approval_status = leave.managerApprovalStatus;
    if (leave.hrApprovalStatus) dbLeave.hr_approval_status = leave.hrApprovalStatus;
    if (leave.attachmentUrl) dbLeave.attachment_url = leave.attachmentUrl;
    if (leave.isWorkingAbsence !== undefined) dbLeave.is_working_absence = leave.isWorkingAbsence;
    if (leave.backupUserId) dbLeave.backup_user_id = leave.backupUserId;

    // Resilient Insert
    let payload = { ...dbLeave };
    let success = false;
    let finalData = null;

    while (!success) {
      const { data, error } = await supabase.from('leaves').insert(payload).select().single();
      if (!error && data) {
        success = true;
        finalData = data;
      } else if (error && error.message?.includes('column') && error.message?.includes('does not exist')) {
        const match = error.message.match(/(\w+)/);
        const col = match ? match[1] : null;
        if (col && col in payload) {
          console.warn(`[Resiliency] Stripping unsupported column "${col}" from leaves table`);
          const { [col]: _, ...rest } = payload as any;
          payload = rest;
        } else {
          break;
        }
      } else {
        console.warn("DB Insert failed", error);
        break;
      }
    }

    if (!finalData) {
      addToast('error', 'Erro ao criar ausência.');
      return;
    }
    const data = finalData;
    setLeaves(prev => [{ ...leave, id: data.id, createdAt: data.created_at } as Leave, ...prev]);
    addToast('success', 'Ausência registada.');

    // Notify admins about new leave request
    const adminIds = users.filter((u: User) => u.role === 'ADMIN' || u.role === 'Administrador').map((u: User) => u.id);
    const requesterName = users.find((u: User) => u.id === leave.userId)?.name || 'Colaborador';
    emitNotificationBulk(adminIds, {
      type: 'LEAVE_REQUEST',
      title: 'Novo Pedido de Ausência',
      description: `${requesterName} submeteu um pedido de ausência.`,
      severity: 'warning',
      actionType: 'APPROVE_LEAVE',
      referenceId: data.id,
      referenceTable: 'leaves',
      actionUrl: '/admin/absences',
    });
  };

  const handleUpdateLeave = async (leave: Leave) => {
    // Map status to database format (lowercase)
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'APPROVED': 'approved',
      'REJECTED': 'rejected'
    };

    // Build payload, filtering out undefined/null values that cause Supabase 400 errors
    const rawPayload: Record<string, any> = {
      status: statusMap[leave.status] || leave.status.toLowerCase(),
      notes: leave.notes,
      approved_by: leave.approvedBy,
      approval_step: leave.approvalStep,
      manager_approval_status: leave.managerApprovalStatus,
      hr_approval_status: leave.hrApprovalStatus,
      is_working_absence: leave.isWorkingAbsence,
      start_date: leave.startDate,
      end_date: leave.endDate,
    };
    // Remove undefined/null keys — Supabase rejects them with 400
    const dbLeave = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined && v !== null)
    );

    if (!leave.id) {
      console.error("Update failed: No ID provided for leave", leave);
      return;
    }

    // Resilient Update
    let payload = { ...dbLeave };
    let success = false;
    while (!success) {
      const { error } = await supabase.from('leaves').update(payload).eq('id', leave.id);
      if (!error) {
        success = true;
      } else if (error && error.message?.includes('column') && error.message?.includes('does not exist')) {
        const match = error.message.match(/(\w+)/);
        const col = match ? match[1] : null;
        if (col && col in payload) {
          console.warn(`[Resiliency] Stripping unsupported column "${col}" from leaves table update`);
          const { [col]: _, ...rest } = payload as any;
          payload = rest;
        } else {
          break;
        }
      } else {
        console.error("DB Update failed:", error.message, error.details, error.hint, "Payload:", payload);
        addToast('error', `Erro ao atualizar ausência: ${error.message || 'erro desconhecido'}`);
        return;
      }
    }

    setLeaves(prev => prev.map(l => l.id === leave.id ? leave : l));

    // Sync legacy absences state
    setAbsences(prev => prev.map(a => a.id === leave.id ? { ...a, status: leave.status as any } : a));

    const statusLabel = leave.status === 'APPROVED' ? 'aprovada' : leave.status === 'REJECTED' ? 'rejeitada' : 'atualizada';
    addToast('success', `Ausência ${statusLabel}.`);

    // Notify employee about leave decision
    if (leave.status === 'APPROVED' || leave.status === 'REJECTED') {
      const statusPt = leave.status === 'APPROVED' ? 'aprovado' : 'rejeitado';
      emitNotification({
        userId: leave.userId,
        type: leave.status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        title: `Pedido de Ausência ${statusPt.charAt(0).toUpperCase() + statusPt.slice(1)}`,
        description: `O seu pedido de ausência foi ${statusPt}.`,
        severity: leave.status === 'APPROVED' ? 'success' : 'error',
        referenceId: leave.id,
        referenceTable: 'leaves',
        actionUrl: '/portal/profile',
      });
    }
  };


  // --- DELETE TIME LOG HANDLER (RH / Admin only) ---
  const handleDeleteTimeLog = async (id: number) => {
    const { error } = await supabase.from('time_logs').delete().eq('id', id);
    if (error) {
      console.error('Error deleting time log:', error);
      addToast('error', 'Erro ao apagar registo de ponto.');
      return;
    }
    setTimeLogs(prev => prev.filter(l => l.id !== id));
    addToast('success', 'Registo de ponto apagado com sucesso.');
  };

  const handleAddHourBankAdjustment = async (adj: Omit<HourBankAdjustment, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('hour_bank_adjustments').insert({
      user_id: adj.userId,
      adjustment_minutes: adj.adjustmentMinutes,
      reason: adj.reason,
      type: adj.type,
      created_by: adj.createdBy
    }).select().single();

    if (error) {
      console.error('Error adding hour bank adjustment:', error);
      addToast('error', 'Erro ao registar ajuste de banco de horas.');
      return;
    }

    const mapped: HourBankAdjustment = {
      id: data.id,
      userId: data.user_id,
      adjustmentMinutes: data.adjustment_minutes,
      reason: data.reason,
      type: data.type,
      createdBy: data.created_by,
      createdAt: data.created_at
    };
    setHourBankAdjustments(prev => [mapped, ...prev]);
    addToast('success', 'Ajuste de banco de horas registado com sucesso.');
  };



  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <HashRouter>
        <AppRoutes
          users={users}
          loading={loading}
          dataReady={dataReady}
          absences={absences}
          timeLogs={timeLogs}
          expenses={expenses}
          messages={messages}
          events={events}
          lockedMonths={lockedMonths}
          jobRoles={jobRoles}
          holidays={holidays}
          departments={departments}
          locations={locations}
          schedulePeriods={schedulePeriods}
          onUpdateUser={handleUpdateUser}
          onAddUser={handleAddUser}
          onUpdateAbsence={handleUpdateAbsence}
          onAddAbsence={handleAddAbsence}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onAddTimeLog={handleAddTimeLog}
          onClockIn={handleClockIn}
          onBreakStart={handleBreakStart}
          onBreakEnd={handleBreakEnd}
          onClockOut={handleClockOut}
          onSendMessage={handleSendMessage}
          onMarkMessageRead={handleMarkMessageRead}
          onAddLock={handleAddLock}
          onDeleteLock={handleDeleteLock}
          onAddRole={handleAddRole}
          onDeleteRole={handleDeleteRole}
          onAddHoliday={handleAddHoliday}
          onDeleteHoliday={handleDeleteHoliday}
          onAddDepartment={handleAddDepartment}
          onDeleteDepartment={handleDeleteDepartment}
          anomalyTypes={anomalyTypes}
          onAddAnomalyType={handleAddAnomalyType}
          onDeleteAnomalyType={handleDeleteAnomalyType}
          onAddLocation={handleAddLocation}
          onUpdateLocation={handleUpdateLocation}
          onDeleteLocation={handleDeleteLocation}
          onAddPeriod={handleAddPeriod}
          onUpdatePeriod={handleUpdatePeriod}
          onDeletePeriod={handleDeletePeriod}
          scheduleTemplates={scheduleTemplates}
          onAddScheduleTemplate={handleAddScheduleTemplate}
          onUpdateScheduleTemplate={handleUpdateScheduleTemplate}
          onDeleteScheduleTemplate={handleDeleteScheduleTemplate}
          leaveTypes={leaveTypes}
          onAddLeaveType={handleAddLeaveType}
          onUpdateLeaveType={handleUpdateLeaveType}
          onDeleteLeaveType={handleDeleteLeaveType}
          leaves={leaves}
          onAddLeave={handleAddLeave}
          onUpdateLeave={handleUpdateLeave}
          onUpdateDepartment={handleUpdateDepartment}
          anomalies={anomalies}
          onUpdateAnomaly={handleUpdateAnomaly}
          onDeleteTimeLog={handleDeleteTimeLog}
          hourBankAdjustments={hourBankAdjustments}
          onAddHourBankAdjustment={handleAddHourBankAdjustment}
          notifications={notifications}
          unreadNotifCount={unreadNotifCount}
          surveyResponses={surveyResponses}
          anonymousFeedbacks={anonymousFeedbacks}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        />
        </HashRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

// Redirect Helper to preserve query params
const RedirectToPortal = () => {
  const { search } = useLocation();
  return <Navigate to={`/portal${search}`} replace />;
};

// Inner Component to use useAuth hook
const AppRoutes = ({ users, loading, dataReady, absences, timeLogs, expenses, messages, events, lockedMonths, jobRoles, holidays, departments, anomalyTypes, locations, schedulePeriods, scheduleTemplates, leaveTypes, leaves, anomalies, onUpdateUser, onAddUser, onUpdateAbsence, onAddAbsence, onAddExpense, onUpdateExpense, onAddTimeLog, onClockIn, onBreakStart, onBreakEnd, onClockOut, onSendMessage, onMarkMessageRead, onAddLock, onDeleteLock, onAddRole, onDeleteRole, onAddHoliday, onDeleteHoliday, onAddDepartment, onDeleteDepartment, onUpdateDepartment, onAddAnomalyType, onDeleteAnomalyType, onAddLocation, onUpdateLocation, onDeleteLocation, onAddPeriod, onUpdatePeriod, onDeletePeriod, onAddScheduleTemplate, onUpdateScheduleTemplate, onDeleteScheduleTemplate, onAddLeaveType, onUpdateLeaveType, onDeleteLeaveType, onAddLeave, onUpdateLeave, onUpdateAnomaly, onDeleteTimeLog, hourBankAdjustments, onAddHourBankAdjustment, notifications, unreadNotifCount, surveyResponses, anonymousFeedbacks, onMarkNotificationRead, onMarkAllNotificationsRead }: any) => {
  const { user, logout } = useAuth();

  // Derived state for current user full profile (normalized ID check with email fallback)
  const currentUser = useMemo(() => {
    if (!user) return null;
    
    // 1. Try direct ID lookup
    let found = users.find((u: User) => Number(u.id) === Number(user.id));
    
    // 2. If ID is NOT a number (UUID) or not found, try email lookup
    if (!found && user.email) {
      found = users.find((u: User) => u.email?.toLowerCase() === user.email?.toLowerCase());
    }

    if (!found) {
      return {
        id: Number(user.id) || 0,
        name: user.name || 'Colaborador',
        email: user.email || '',
        role: user.role,
        company: Company.SEMRUMO,
        status: UserStatus.ACTIVE,
        created_at: new Date().toISOString(),
        photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'user')}&background=random`,
        attendanceConfig: DEFAULT_ATTENDANCE_CONFIG,
        workStartTime: '09:00',
        workEndTime: '18:00',
        iban: '',
        nif: '',
        cc: '',
        address: '',
        birthDate: '',
        admissionDate: new Date().toISOString().split('T')[0],
        phone: '',
        lunchStartTime: '13:00',
        lunchEndTime: '14:00',
        vacationDaysYearly: 0,
        vacationDaysCarryover: 0,
        vacationAdjustments: 0,
        onboardingTasks: DEFAULT_ONBOARDING_TASKS,
        documents: [],
        department: '',
        niss: '',
        nationality: '',
        mobilePhone: '',
        whatsappEnabled: false,
        locationIds: []
      } as User;
    }

    return found;
  }, [user, users]);

  // Analytics context for LEO AI assistant (admin only)
  const appAnalyticsContext = useMemo(() => {
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'Administrador')) return '';
    const kpis = analyticsService.calculateKPIs(users, timeLogs, leaves);
    const summary = analyticsService.calculateSummary(users, leaves, timeLogs);
    return [
      `Taxa assiduidade: ${kpis.attendanceRate}%`,
      `Absentismo: ${kpis.absenteeismRate}%`,
      `Média horas/dia: ${kpis.avgHours}h`,
      `Aprovações pendentes: ${kpis.pendingApprovals}`,
      `Colaboradores ativos: ${summary.activeUsers}`,
      `A trabalhar hoje: ${summary.clockedInToday}`,
      `De férias hoje: ${summary.onVacationToday}`,
    ].join('\n');
  }, [currentUser, users, timeLogs, leaves]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* AUDITOR */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.AUDITOR, UserRole.ADMIN]} />}>
          <Route path="/auditor" element={<AuditorAccess logs={timeLogs} users={users} />} />
        </Route>

        {/* ADMIN ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
          <Route path="/admin" element={
            <AdminLayout
              onLogout={logout}
              currentUser={currentUser}
              users={users}
              absences={absences}
              expenses={expenses}
              messages={messages}
              notifications={notifications}
              unreadNotifCount={unreadNotifCount}
              leaves={leaves}
              surveyResponses={surveyResponses}
              anonymousFeedbacks={anonymousFeedbacks}
              onMarkNotificationRead={onMarkNotificationRead}
              onMarkAllNotificationsRead={onMarkAllNotificationsRead}
              onUpdateLeave={onUpdateLeave}
              analyticsContext={appAnalyticsContext}
              dataReady={dataReady}
            />
          }>
            <Route index element={<Dashboard users={users} absences={absences} logs={timeLogs} events={events} anomalies={anomalies} onUpdateAnomaly={onUpdateAnomaly} currentUser={currentUser} />} />
            <Route path="users" element={<UserList users={users} />} />
            <Route path="users/:id" element={<UserProfile users={users} absences={absences} leaves={leaves} leaveTypes={leaveTypes} roles={jobRoles} departments={departments} locations={locations} scheduleTemplates={scheduleTemplates} onUpdateUser={onUpdateUser} onAddUser={onAddUser} />} />
            <Route path="absences" element={<AbsenceManagement currentUser={currentUser} leaves={leaves} leaveTypes={leaveTypes} users={users} departments={departments} locations={locations} onUpdateLeave={onUpdateLeave} onAddLeave={onAddLeave} anomalies={anomalies} onUpdateAnomaly={onUpdateAnomaly} />} />
            <Route path="attendance" element={<AttendanceControl logs={timeLogs} users={users} locations={locations} departments={departments} anomalies={anomalies} currentUser={currentUser} onAddLog={onAddTimeLog} onDeleteLog={onDeleteTimeLog} hourBankAdjustments={hourBankAdjustments} onAddHourBankAdjustment={onAddHourBankAdjustment} onUpdateAnomaly={onUpdateAnomaly} />} />
            <Route path="attendance/manual-entry" element={<ManualTimeEntry users={users} locations={locations} onAddLog={onAddTimeLog} />} />
            <Route path="expenses" element={<ExpenseManagement expenses={expenses} onUpdateExpense={onUpdateExpense} />} />
            <Route path="reports" element={<Reports users={users} logs={timeLogs} absences={absences} hourBankAdjustments={hourBankAdjustments} />} />
            <Route path="fleet" element={<FleetManagement users={users} />} />
            <Route path="trip-history" element={<TripHistory users={users} />} />
            <Route path="fleet/monthly-report" element={<MonthlyTripReport />} />
            <Route path="messages" element={<Messages users={users} messages={messages} onSendMessage={onSendMessage} onMarkRead={onMarkMessageRead} />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/lock-month" element={<LockMonth lockedMonths={lockedMonths} onAddLock={onAddLock} onDeleteLock={onDeleteLock} />} />
            <Route path="settings/roles" element={<RolesManagement roles={jobRoles} onAddRole={onAddRole} onDeleteRole={onDeleteRole} />} />
            <Route path="settings/permissions" element={<PermissionsManagement roles={jobRoles} />} />
            <Route path="settings/holidays" element={<HolidaysManagement holidays={holidays} onAddHoliday={onAddHoliday} onDeleteHoliday={onDeleteHoliday} />} />
            <Route path="settings/departments" element={<DepartmentsManagement departments={departments} users={users} onAddDepartment={onAddDepartment} onDeleteDepartment={onDeleteDepartment} onUpdateDepartment={onUpdateDepartment} />} />
            <Route path="documents" element={<DocumentManagement users={users} currentUser={currentUser} leaves={leaves} />} />
            <Route path="settings/anomalies" element={<AnomalyTypesManagement anomalyTypes={anomalyTypes} onAddAnomalyType={onAddAnomalyType} onDeleteAnomalyType={onDeleteAnomalyType} />} />
            <Route path="anomalies" element={<AnomalyDashboard currentUser={currentUser} users={users} departments={departments} />} />
            <Route path="settings/integrations" element={<PayrollIntegration users={users} />} />
            <Route path="locations" element={<LocationsManagement locations={locations} onAddLocation={onAddLocation} onUpdateLocation={onUpdateLocation} onDeleteLocation={onDeleteLocation} />} />
            <Route path="settings/schedules" element={<SchedulePeriods periods={schedulePeriods} onAddPeriod={onAddPeriod} onUpdatePeriod={onUpdatePeriod} onDeletePeriod={onDeletePeriod} />} />
            <Route path="settings/schedule-templates" element={<ScheduleTemplates templates={scheduleTemplates} onAdd={onAddScheduleTemplate} onUpdate={onUpdateScheduleTemplate} onDelete={onDeleteScheduleTemplate} />} />
            <Route path="settings/leave-types" element={<LeaveTypesManagement leaveTypes={leaveTypes} onAdd={onAddLeaveType} onUpdate={onUpdateLeaveType} onDelete={onDeleteLeaveType} />} />
            <Route path="team-calendar" element={<TeamCalendar currentUser={currentUser} users={users} leaves={leaves} leaveTypes={leaveTypes} scheduleTemplates={scheduleTemplates} locations={locations} departments={departments} onAddLeave={onAddLeave} onUpdateLeave={onUpdateLeave} />} />
            <Route path="analytics" element={<AnalyticsDashboard users={users} timeLogs={timeLogs} leaves={leaves} leaveTypes={leaveTypes} anomalies={anomalies} departments={departments} />} />
            <Route path="climate" element={<OrganizationalClimate users={users} departments={departments} surveyResponses={surveyResponses} anonymousFeedbacks={anonymousFeedbacks} />} />
            {/* <Route path="notifications" element={<NotificationsPage />} /> */}
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRole.COLLABORATOR, UserRole.ADMIN, UserRole.AUDITOR]} />}>
          <Route path="/rewards" element={
            currentUser ? (
              <CollaboratorLayout user={currentUser} onLogout={logout}>
                <Rewards user={currentUser} />
              </CollaboratorLayout>
            ) : <PageLoader />
          } />
        </Route>

        {/* EMPLOYEE PORTAL ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.COLLABORATOR, UserRole.ADMIN]} />}>
          <Route path="/portal">
            <Route index element={
              currentUser ? (
                <ResilientKioskWrapper
                  currentUser={currentUser}
                  timeLogs={timeLogs}
                  users={users}
                  locations={locations}
                  lockedMonths={lockedMonths}
                  scheduleTemplates={scheduleTemplates}
                >
                  {({ handleClockIn: wrappedClockIn, handleClockOut: wrappedClockOut }) => (
                    <KioskDashboard
                      user={currentUser}
                      events={events}
                      messages={messages}
                      onClockIn={wrappedClockIn}
                      onClockOut={wrappedClockOut}
                      lastLog={timeLogs.find((l: any) => String(l.userId) === String(currentUser.id) && !l.checkOut)}
                      onLogout={logout}
                      timeLogs={timeLogs}
                      hourBankAdjustments={hourBankAdjustments}
                      leaves={leaves}
                      leaveTypes={leaveTypes}
                      scheduleTemplates={scheduleTemplates}
                      dataReady={dataReady}
                    />
                  )}
                </ResilientKioskWrapper>
              ) : (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 text-red-500">
                  <div className="h-10 w-10 animate-spin mb-4 border-b-2 border-red-500 rounded-full" />
                  <h1 className="text-2xl font-bold">DEBUG: Portal Blocked</h1>
                  <p>currentUser is NULL in App.tsx Router!</p>
                  <pre className="mt-4 bg-gray-200 p-4 rounded text-xs text-black text-left w-96 overflow-auto">
                    {JSON.stringify({
                      usersLength: users.length,
                      dataReady,
                      hasAuthUser: !!user,
                      authUserId: user?.id,
                      authUserName: user?.name,
                    }, null, 2)}
                  </pre>
                </div>
              )
            } />



            <Route element={
              currentUser ? (
                <CollaboratorLayout
                  user={currentUser}
                  onLogout={logout}
                  unreadMessagesCount={messages.filter((m: any) => m.receiverId === currentUser.id && !m.read).length}
                  notifications={notifications}
                  onMarkNotificationRead={onMarkNotificationRead}
                  onMarkAllNotificationsRead={onMarkAllNotificationsRead}
                >
                  <Outlet />
                </CollaboratorLayout>
              ) : (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 text-orange-500">
                  <div className="h-10 w-10 animate-spin mb-4 border-b-2 border-orange-500 rounded-full" />
                  <h1 className="text-2xl font-bold">DEBUG: CollaboratorLayout Blocked</h1>
                  <p>currentUser is NULL in App.tsx Router!</p>
                </div>
              )
            }>
              <Route path="profile" element={<MyProfile user={currentUser!} absences={absences} departments={departments} users={users} leaveTypes={leaveTypes} scheduleTemplates={scheduleTemplates} onUpdate={onUpdateUser} onAddAbsence={onAddAbsence} anomalies={anomalies} onUpdateAnomaly={onUpdateAnomaly} timeLogs={timeLogs} leaves={leaves} />} />
              <Route path="attendance" element={<EmployeeAttendance user={currentUser!} logs={timeLogs} leaves={leaves} leaveTypes={leaveTypes} scheduleTemplates={scheduleTemplates} />} />
              <Route path="time-bank" element={<EmployeeTimeBank user={currentUser!} logs={timeLogs} adjustments={hourBankAdjustments} />} />
              <Route path="expenses" element={<MyExpenses user={currentUser!} expenses={expenses} onAddExpense={onAddExpense} />} />
              <Route path="vacations" element={<EmployeeVacations user={currentUser!} leaves={leaves} leaveTypes={leaveTypes} scheduleTemplates={scheduleTemplates} />} />
              <Route path="fleet-booking" element={<FleetBooking user={currentUser!} />} />
              <Route path="vehicle" element={<MyVehicle user={currentUser!} />} />
              <Route path="messages" element={<Messages currentUser={currentUser!} users={users} messages={messages} onSendMessage={onSendMessage} onMarkRead={onMarkMessageRead} />} />
              <Route path="request-leave" element={<RequestLeave user={currentUser!} users={users} leaveTypes={leaveTypes} leaves={leaves} scheduleTemplates={scheduleTemplates} onAddLeave={onAddLeave} kioskMode={true} />} />
              <Route path="team-calendar" element={<TeamCalendar currentUser={currentUser!} users={users} leaves={leaves} leaveTypes={leaveTypes} scheduleTemplates={scheduleTemplates} locations={locations} departments={departments} onAddLeave={onAddLeave} onUpdateLeave={onUpdateLeave} kioskMode={false} />} />
              <Route path="team-status" element={<TeamStatus users={users} logs={timeLogs} />} />
              <Route path="feedback" element={<EmployeeFeedback user={currentUser!} />} />
              {/* <Route path="notifications" element={<NotificationsPage />} /> */}
            </Route>
          </Route>
        </Route>

        <Route path="/kiosk" element={<RedirectToPortal />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

// Helper for Haversine Distance
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Meters
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default App;
