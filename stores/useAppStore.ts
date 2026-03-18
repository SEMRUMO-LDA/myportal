/**
 * App Store - Global state management usando Zustand
 * Substitui o estado local massivo do App.tsx
 */

import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { errorHandler } from '../utils/errorHandler';
import {
  User,
  Absence,
  TimeLog,
  Expense,
  InternalMessage,
  AppEvent,
  LockedMonth,
  JobRole,
  Holiday,
  Department,
  AnomalyType,
  Location,
  SchedulePeriod,
  ScheduleTemplate,
  LeaveType,
  Leave,
  Anomaly,
  HourBankAdjustment,
  PersistentNotification
} from '../types';

interface AppState {
  // Loading states
  loading: boolean;
  dataReady: boolean;

  // Core data
  users: User[];
  absences: Absence[];
  timeLogs: TimeLog[];
  expenses: Expense[];
  messages: InternalMessage[];
  events: AppEvent[];

  // Settings
  lockedMonths: LockedMonth[];
  jobRoles: JobRole[];
  holidays: Holiday[];
  departments: Department[];
  anomalyTypes: AnomalyType[];
  locations: Location[];
  schedulePeriods: SchedulePeriod[];
  scheduleTemplates: ScheduleTemplate[];
  leaveTypes: LeaveType[];

  // Leave & Time management
  leaves: Leave[];
  anomalies: Anomaly[];
  hourBankAdjustments: HourBankAdjustment[];

  // Notifications
  notifications: PersistentNotification[];
  unreadNotifCount: number;

  // Pulse & Feedback
  surveyResponses: any[];
  anonymousFeedbacks: any[];

  // Actions
  setLoading: (loading: boolean) => void;
  setDataReady: (ready: boolean) => void;

  // Data setters
  setUsers: (users: User[]) => void;
  setAbsences: (absences: Absence[]) => void;
  setTimeLogs: (timeLogs: TimeLog[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setMessages: (messages: InternalMessage[]) => void;
  setEvents: (events: AppEvent[]) => void;
  setLockedMonths: (months: LockedMonth[]) => void;
  setJobRoles: (roles: JobRole[]) => void;
  setHolidays: (holidays: Holiday[]) => void;
  setDepartments: (departments: Department[]) => void;
  setAnomalyTypes: (types: AnomalyType[]) => void;
  setLocations: (locations: Location[]) => void;
  setSchedulePeriods: (periods: SchedulePeriod[]) => void;
  setScheduleTemplates: (templates: ScheduleTemplate[]) => void;
  setLeaveTypes: (types: LeaveType[]) => void;
  setLeaves: (leaves: Leave[]) => void;
  setAnomalies: (anomalies: Anomaly[]) => void;
  setHourBankAdjustments: (adjustments: HourBankAdjustment[]) => void;
  setNotifications: (notifications: PersistentNotification[]) => void;
  setUnreadNotifCount: (count: number) => void;
  setSurveyResponses: (responses: any[]) => void;
  setAnonymousFeedbacks: (feedbacks: any[]) => void;

  // CRUD Operations
  addUser: (user: User) => void;
  updateUser: (id: number, updates: Partial<User>) => void;
  deleteUser: (id: number) => void;

  addAbsence: (absence: Absence) => void;
  updateAbsence: (id: number, updates: Partial<Absence>) => void;
  deleteAbsence: (id: number) => void;

  addTimeLog: (log: TimeLog) => void;
  updateTimeLog: (id: number, updates: Partial<TimeLog>) => void;
  deleteTimeLog: (id: number) => void;

  addExpense: (expense: Expense) => void;
  updateExpense: (id: number, updates: Partial<Expense>) => void;

  addMessage: (message: InternalMessage) => void;
  markMessageRead: (id: number) => void;

  addLock: (lock: LockedMonth) => void;
  deleteLock: (id: number) => void;

  addRole: (role: JobRole) => void;
  deleteRole: (id: number) => void;

  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (id: number) => void;

  addDepartment: (dept: Department) => void;
  updateDepartment: (id: number, updates: Partial<Department>) => void;
  deleteDepartment: (id: number) => void;

  addAnomalyType: (type: AnomalyType) => void;
  deleteAnomalyType: (id: number) => void;

  addLocation: (location: Location) => void;
  updateLocation: (id: number, updates: Partial<Location>) => void;
  deleteLocation: (id: number) => void;

  addSchedulePeriod: (period: SchedulePeriod) => void;
  updateSchedulePeriod: (id: number, updates: Partial<SchedulePeriod>) => void;
  deleteSchedulePeriod: (id: number) => void;

  addScheduleTemplate: (template: ScheduleTemplate) => void;
  updateScheduleTemplate: (id: number, updates: Partial<ScheduleTemplate>) => void;
  deleteScheduleTemplate: (id: number) => void;

  addLeaveType: (type: LeaveType) => void;
  updateLeaveType: (id: number, updates: Partial<LeaveType>) => void;
  deleteLeaveType: (id: number) => void;

  addLeave: (leave: Leave) => void;
  updateLeave: (id: number, updates: Partial<Leave>) => void;

  updateAnomaly: (id: number, updates: Partial<Anomaly>) => void;

  addHourBankAdjustment: (adjustment: HourBankAdjustment) => void;

  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;

  // Bulk operations
  clearSensitiveData: () => void;
  resetStore: () => void;

  // Data fetching
  fetchAllData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  loading: true,
  dataReady: false,

  users: [],
  absences: [],
  timeLogs: [],
  expenses: [],
  messages: [],
  events: [],
  lockedMonths: [],
  jobRoles: [],
  holidays: [],
  departments: [],
  anomalyTypes: [],
  locations: [],
  schedulePeriods: [],
  scheduleTemplates: [],
  leaveTypes: [],
  leaves: [],
  anomalies: [],
  hourBankAdjustments: [],
  notifications: [],
  unreadNotifCount: 0,
  surveyResponses: [],
  anonymousFeedbacks: [],

  // Basic setters
  setLoading: (loading) => set({ loading }),
  setDataReady: (dataReady) => set({ dataReady }),

  setUsers: (users) => set({ users }),
  setAbsences: (absences) => set({ absences }),
  setTimeLogs: (timeLogs) => set({ timeLogs }),
  setExpenses: (expenses) => set({ expenses }),
  setMessages: (messages) => set({ messages }),
  setEvents: (events) => set({ events }),
  setLockedMonths: (lockedMonths) => set({ lockedMonths }),
  setJobRoles: (jobRoles) => set({ jobRoles }),
  setHolidays: (holidays) => set({ holidays }),
  setDepartments: (departments) => set({ departments }),
  setAnomalyTypes: (anomalyTypes) => set({ anomalyTypes }),
  setLocations: (locations) => set({ locations }),
  setSchedulePeriods: (schedulePeriods) => set({ schedulePeriods }),
  setScheduleTemplates: (scheduleTemplates) => set({ scheduleTemplates }),
  setLeaveTypes: (leaveTypes) => set({ leaveTypes }),
  setLeaves: (leaves) => set({ leaves }),
  setAnomalies: (anomalies) => set({ anomalies }),
  setHourBankAdjustments: (hourBankAdjustments) => set({ hourBankAdjustments }),
  setNotifications: (notifications) => set({ notifications }),
  setUnreadNotifCount: (unreadNotifCount) => set({ unreadNotifCount }),
  setSurveyResponses: (surveyResponses) => set({ surveyResponses }),
  setAnonymousFeedbacks: (anonymousFeedbacks) => set({ anonymousFeedbacks }),

  // CRUD Operations
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, updates) => set((state) => ({
    users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
  })),
  deleteUser: (id) => set((state) => ({
    users: state.users.filter(u => u.id !== id)
  })),

  addAbsence: (absence) => set((state) => ({ absences: [...state.absences, absence] })),
  updateAbsence: (id, updates) => set((state) => ({
    absences: state.absences.map(a => a.id === id ? { ...a, ...updates } : a)
  })),
  deleteAbsence: (id) => set((state) => ({
    absences: state.absences.filter(a => a.id !== id)
  })),

  addTimeLog: (log) => set((state) => ({ timeLogs: [...state.timeLogs, log] })),
  updateTimeLog: (id, updates) => set((state) => ({
    timeLogs: state.timeLogs.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTimeLog: (id) => set((state) => ({
    timeLogs: state.timeLogs.filter(t => t.id !== id)
  })),

  addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
  updateExpense: (id, updates) => set((state) => ({
    expenses: state.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
  })),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  markMessageRead: (id) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, read: true } : m)
  })),

  addLock: (lock) => set((state) => ({ lockedMonths: [...state.lockedMonths, lock] })),
  deleteLock: (id) => set((state) => ({
    lockedMonths: state.lockedMonths.filter(l => l.id !== id)
  })),

  addRole: (role) => set((state) => ({ jobRoles: [...state.jobRoles, role] })),
  deleteRole: (id) => set((state) => ({
    jobRoles: state.jobRoles.filter(r => r.id !== id)
  })),

  addHoliday: (holiday) => set((state) => ({ holidays: [...state.holidays, holiday] })),
  deleteHoliday: (id) => set((state) => ({
    holidays: state.holidays.filter(h => h.id !== id)
  })),

  addDepartment: (dept) => set((state) => ({ departments: [...state.departments, dept] })),
  updateDepartment: (id, updates) => set((state) => ({
    departments: state.departments.map(d => d.id === id ? { ...d, ...updates } : d)
  })),
  deleteDepartment: (id) => set((state) => ({
    departments: state.departments.filter(d => d.id !== id)
  })),

  addAnomalyType: (type) => set((state) => ({ anomalyTypes: [...state.anomalyTypes, type] })),
  deleteAnomalyType: (id) => set((state) => ({
    anomalyTypes: state.anomalyTypes.filter(a => a.id !== id)
  })),

  addLocation: (location) => set((state) => ({ locations: [...state.locations, location] })),
  updateLocation: (id, updates) => set((state) => ({
    locations: state.locations.map(l => l.id === id ? { ...l, ...updates } : l)
  })),
  deleteLocation: (id) => set((state) => ({
    locations: state.locations.filter(l => l.id !== id)
  })),

  addSchedulePeriod: (period) => set((state) => ({ schedulePeriods: [...state.schedulePeriods, period] })),
  updateSchedulePeriod: (id, updates) => set((state) => ({
    schedulePeriods: state.schedulePeriods.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  deleteSchedulePeriod: (id) => set((state) => ({
    schedulePeriods: state.schedulePeriods.filter(p => p.id !== id)
  })),

  addScheduleTemplate: (template) => set((state) => ({ scheduleTemplates: [...state.scheduleTemplates, template] })),
  updateScheduleTemplate: (id, updates) => set((state) => ({
    scheduleTemplates: state.scheduleTemplates.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteScheduleTemplate: (id) => set((state) => ({
    scheduleTemplates: state.scheduleTemplates.filter(t => t.id !== id)
  })),

  addLeaveType: (type) => set((state) => ({ leaveTypes: [...state.leaveTypes, type] })),
  updateLeaveType: (id, updates) => set((state) => ({
    leaveTypes: state.leaveTypes.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteLeaveType: (id) => set((state) => ({
    leaveTypes: state.leaveTypes.filter(t => t.id !== id)
  })),

  addLeave: (leave) => set((state) => ({ leaves: [...state.leaves, leave] })),
  updateLeave: (id, updates) => set((state) => ({
    leaves: state.leaves.map(l => l.id === id ? { ...l, ...updates } : l)
  })),

  updateAnomaly: (id, updates) => set((state) => ({
    anomalies: state.anomalies.map(a => a.id === id ? { ...a, ...updates } : a)
  })),

  addHourBankAdjustment: (adjustment) => set((state) => ({
    hourBankAdjustments: [...state.hourBankAdjustments, adjustment]
  })),

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadNotifCount: Math.max(0, state.unreadNotifCount - 1)
  })),

  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadNotifCount: 0
  })),

  // Bulk operations
  clearSensitiveData: () => set({
    absences: [],
    timeLogs: [],
    expenses: [],
    messages: [],
    events: [],
    lockedMonths: [],
    jobRoles: [],
    holidays: [],
    departments: [],
    anomalyTypes: [],
    locations: [],
    schedulePeriods: [],
    scheduleTemplates: [],
    leaveTypes: [],
    leaves: [],
    anomalies: [],
    hourBankAdjustments: [],
    notifications: [],
    unreadNotifCount: 0,
    surveyResponses: [],
    anonymousFeedbacks: []
  }),

  resetStore: () => set({
    loading: true,
    dataReady: false,
    users: [],
    absences: [],
    timeLogs: [],
    expenses: [],
    messages: [],
    events: [],
    lockedMonths: [],
    jobRoles: [],
    holidays: [],
    departments: [],
    anomalyTypes: [],
    locations: [],
    schedulePeriods: [],
    scheduleTemplates: [],
    leaveTypes: [],
    leaves: [],
    anomalies: [],
    hourBankAdjustments: [],
    notifications: [],
    unreadNotifCount: 0,
    surveyResponses: [],
    anonymousFeedbacks: []
  }),

  // Data fetching (placeholder - será implementado depois)
  fetchAllData: async () => {
    try {
      set({ loading: true });

      // TODO: Implementar fetching real
      // const [users, absences, ...] = await Promise.all([...]);

      set({ dataReady: true, loading: false });
    } catch (error) {
      errorHandler.handle(error, 'useAppStore.fetchAllData');
      set({ loading: false });
    }
  }
}));
