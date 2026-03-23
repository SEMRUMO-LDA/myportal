
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE'
}

export const UserStatusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Ativo',
  [UserStatus.INACTIVE]: 'Inativo',
  [UserStatus.ON_LEAVE]: 'De Baixa'
};

export enum Company {
  SEMRUMO = 'SEMRUMO',
  AORUBRO = 'AORUBRO',
  HAKURA = 'HAKURA'
}

export interface OnboardingTask {
  id: string;
  label: string;
  completed: boolean;
}

export interface UserDocument {
  id: string;
  title: string;
  type: string;
  uploadDate: string;
  isSigned?: boolean;
  requiresSignature?: boolean;
  signedDate?: string;
}

export type AttendanceRestrictionType = 'NONE' | 'IP' | 'GEO' | 'BOTH';

export interface GeoLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface AttendanceConfig {
  restriction: AttendanceRestrictionType;
  allowedIps: string[];
  allowedLocations: GeoLocation[];

  // Remote / Hybrid Work
  isRemote?: boolean;
  homeCoordinates?: {
    lat: number;
    lng: number;
    radius: number; // Tolerance for home
    address?: string;
  };

  // New Toggles
  restrictIp?: boolean;
  restrictGeo?: boolean;
  manualEntry?: boolean;
  desktopWebEntry?: boolean; // Picagem no Computador/tablet (Web)
  mobileWebEntry?: boolean;  // Picagem no Telemóvel (Web)
  appEntry?: boolean;        // Picagem na App

  // Feature flags
  vacationRequests?: boolean; // Pedidos Férias
  disableAnomalies?: boolean; // Desativar anomalias
  hourBank?: boolean;         // Bolsa de Horas
  blockEntry?: boolean;       // Bloquear picagem
  flexibleSchedule?: boolean; // Horário Flexível
  minimumDailyHours?: number; // Horas mínimas diárias (para horário flexível, default 8)
  hideAbsences?: boolean;     // Ocultar ausências (privacidade bidirecional)
}

export interface User {
  id: number; // int8 in DB - ÚNICO IDENTIFICADOR (substituiu 'code' e 'numero_colaborador')
  authId?: string; // UUID in DB
  name: string; // text in DB
  role: string; // text in DB
  company: Company | string; // text in DB (mapped from brand)
  created_at?: string; // timestamptz in DB

  // Extended App Fields
  email: string;
  department: string;
  iban?: string;
  status: UserStatus;

  // Security
  pin?: string;
  requiresNewPin?: boolean;
  mobilePhone?: string;
  whatsappEnabled?: boolean;

  // Personal Identifiers
  nif: string;
  cc: string;
  niss?: string; // Social Security Number
  nationality?: string;
  maritalStatus?: string;

  address: string;
  birthDate: string;
  admissionDate: string;
  phone: string;
  photoUrl: string;
  emergencyContact?: string;
  bio?: string;

  // System Configs
  onboardingTasks?: OnboardingTask[];
  documents?: UserDocument[];
  attendanceConfig?: AttendanceConfig;

  // Schedule Definition - DEPRECATED: Use scheduleTemplateId instead
  /**
   * @deprecated Use scheduleTemplateId and fetch from ScheduleTemplate instead.
   * These fields will be removed in version 3.0.
   * For dynamic schedules, rotating shifts, and day-specific times, use ScheduleTemplate.
   */
  workStartTime?: string;
  /**
   * @deprecated Use scheduleTemplateId and fetch from ScheduleTemplate instead.
   * Will be removed in version 3.0.
   */
  workEndTime?: string;
  /**
   * @deprecated Use scheduleTemplateId and fetch from ScheduleTemplate instead.
   * Will be removed in version 3.0.
   */
  lunchStartTime?: string;
  /**
   * @deprecated Use scheduleTemplateId and fetch from ScheduleTemplate instead.
   * Will be removed in version 3.0.
   */
  lunchEndTime?: string;

  // Vacation Management
  vacationDaysYearly?: number;
  vacationDaysCarryover?: number;
  vacationAdjustments?: number;

  // Location(s)
  locationId?: number;  // Primary location (legacy)
  locationIds?: number[]; // Multiple work locations
  location?: Location;

  // Schedule Assignment
  scheduleTemplateId?: number;
  scheduleCycleStartDate?: string; // Reference date for rotating shifts (Day 1 of cycle)
}

export interface Location {
  id: number;
  name: string;
  address?: string;
  observations?: string;
  locality?: string;
  postalCode?: string;
  mobile?: string;
  phone?: string;
  email?: string;

  // Settings
  toleranceEntry?: number;
  toleranceExit?: number;
  blockEntry?: boolean;
  blockExit?: boolean;
  allowedIps?: string;
  notificationEmails?: {
    email1?: string;
    email2?: string;
  };

  // Geofencing & Map
  coordinates?: {
    lat: number;
    lng: number;
    radius?: number;
  };

  // Extra Hours / Absence Counting
  extraHoursStart?: number; // minutes
  missingHoursStart?: number; // minutes
  countExtraAfterExit?: boolean;
  timezone?: string;

  // Responsável da Unidade
  managerId?: number;

  status: 'active' | 'inactive';
  createdAt?: string;
}

// History Log
export interface UserHistoryLog {
  id: string;
  date: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
}

export enum AbsenceStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING'
}

export const AbsenceStatusLabels: Record<AbsenceStatus, string> = {
  [AbsenceStatus.APPROVED]: 'Aprovado',
  [AbsenceStatus.REJECTED]: 'Rejeitado',
  [AbsenceStatus.PENDING]: 'Pendente'
};

export enum AbsenceType {
  VACATION = 'VACATION',
  MEDICAL = 'MEDICAL',
  PARENTAL = 'PARENTAL',
  REMOTE = 'REMOTE'
}

export const AbsenceTypeLabels: Record<AbsenceType, string> = {
  [AbsenceType.VACATION]: 'Férias',
  [AbsenceType.MEDICAL]: 'Baixa Médica',
  [AbsenceType.PARENTAL]: 'Licença Parental',
  [AbsenceType.REMOTE]: 'Trabalho Remoto'
};

export interface Absence {
  id: number | string;
  userId: number;
  userName: string;
  company: string;
  status: AbsenceStatus;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  notes?: string;
}

// EXPENSES
export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID'
}

export const ExpenseStatusLabels: Record<ExpenseStatus, string> = {
  [ExpenseStatus.PENDING]: 'Pendente',
  [ExpenseStatus.APPROVED]: 'Aprovada',
  [ExpenseStatus.REJECTED]: 'Rejeitada',
  [ExpenseStatus.PAID]: 'Processada em Salário'
};

export enum ExpenseCategory {
  MEALS = 'MEALS',
  TRANSPORT = 'TRANSPORT',
  ACCOMMODATION = 'ACCOMMODATION',
  SUPPLIES = 'SUPPLIES',
  REPRESENTATION = 'REPRESENTATION',
  OTHER = 'OTHER'
}

export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  [ExpenseCategory.MEALS]: 'Alimentação',
  [ExpenseCategory.TRANSPORT]: 'Transporte / Km',
  [ExpenseCategory.ACCOMMODATION]: 'Alojamento',
  [ExpenseCategory.SUPPLIES]: 'Material Escritório',
  [ExpenseCategory.REPRESENTATION]: 'Representação',
  [ExpenseCategory.OTHER]: 'Outros'
};

export interface Expense {
  id: string | number;
  userId: number;
  userName: string;
  userCompany: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  receiptUrl?: string; // Base64 or URL
  status: ExpenseStatus;
  rejectionReason?: string;
  submissionDate: string;
}

export enum TimeLogStatus {
  ON_TIME = 'ON_TIME',
  LATE = 'LATE',
  OVERTIME = 'OVERTIME',
  INCOMPLETE = 'INCOMPLETE',
  PRESENT = 'PRESENT',
  ANOMALY = 'ANOMALY'
}

export const TimeLogStatusLabels: Record<TimeLogStatus, string> = {
  [TimeLogStatus.ON_TIME]: 'No Horário',
  [TimeLogStatus.LATE]: 'Atraso',
  [TimeLogStatus.OVERTIME]: 'Hora Extra',
  [TimeLogStatus.INCOMPLETE]: 'Incompleto',
  [TimeLogStatus.PRESENT]: 'Presente',
  [TimeLogStatus.ANOMALY]: 'Anomalia'
};

export interface TimeLog {
  id: string | number;
  userId: number;
  date: string;
  checkIn?: string;
  checkInLocation?: string;
  checkInIp?: string;
  checkInCoordinates?: { lat: number; lng: number };
  checkOut?: string;
  checkOutLocation?: string;
  checkOutIp?: string;
  checkOutCoordinates?: { lat: number; lng: number };
  status: TimeLogStatus;
  totalHours?: number;
  breakStart?: string;
  breakEnd?: string;
  user?: User; // Optional populated field
  createdAt?: string;
  isOffline?: boolean;
}

export interface HourBankAdjustment {
  id: number;
  userId: number;
  adjustmentMinutes: number;
  reason: string;
  type: 'manual' | 'correction' | 'reset';
  createdBy: number;
  createdByName?: string;
  createdAt: string;
}

export interface InternalMessage {
  id: string;
  senderId: string | number;
  senderName: string;
  receiverId: number;
  subject: string;
  content: string;
  date: string;
  read: boolean;
  priority: 'NORMAL' | 'HIGH';
}

// Events & Calendar
export type EventType = 'BIRTHDAY' | 'COMPANY' | 'HOLIDAY' | 'MEETING';

export interface AppEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  description?: string;
  location?: string;
}

// UI Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface AppNotification {
  id: string;
  type: 'MESSAGE' | 'TASK' | 'ALERT' | 'INFO';
  title: string;
  description: string;
  date: string;
  actionUrl?: string;
  read: boolean;
}

// ============================================
// NOTIFICATION CENTER TYPES
// ============================================

export type NotificationCategory =
  | 'LEAVE_REQUEST' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED'
  | 'EXPENSE_SUBMITTED' | 'EXPENSE_APPROVED' | 'EXPENSE_REJECTED'
  | 'ANOMALY_CREATED' | 'ANOMALY_ESCALATED'
  | 'MESSAGE_RECEIVED' | 'DOCUMENT_UPLOADED' | 'SYSTEM';

export type NotificationSeverity = 'info' | 'warning' | 'success' | 'error';

export type NotificationActionType = 'APPROVE_LEAVE' | 'VIEW' | null;

export interface PersistentNotification {
  id: number;
  userId: number;
  type: NotificationCategory;
  title: string;
  description: string;
  severity: NotificationSeverity;
  read: boolean;
  actionType: NotificationActionType;
  referenceId: string | null;
  referenceTable: string | null;
  actionUrl: string | null;
  createdAt: string;
}

export interface LockedMonth {
  id: number;
  year: number;
  month: number;
  isLocked: boolean;
}

export interface JobRole {
  id: number;
  name: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'National' | 'Local' | 'Optional';
  year: number;
  locationId?: number; // NULL = National, otherwise specific location
}

export interface Department {
  id: number;
  name: string;
  managerId?: number;
  manager?: User;
}

export interface AnomalyType {
  id: number;
  name: string;
  isJustified: boolean;
  type: 'Falta' | 'Extra';
  rhCode?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface Anomaly {
  id: number;
  userId: number;
  timeLogId?: number; // Optional link to the specific time log
  type: 'LATE_ENTRY' | 'EARLY_EXIT' | 'MISSING_CLOCK_IN' | 'MISSING_CLOCK_OUT' | 'HOURS_DEFICIT' | 'HOURS_SURPLUS';
  minutes: number; // Minutes of violation
  status: 'PENDING' | 'AWAITING_JUSTIFICATION' | 'JUSTIFIED_PENDING_REVIEW' | 'JUSTIFIED_MANAGER' | 'ESCALATED_HR' | 'REJECTED';
  managerId?: number; // Who validated/escalated
  managerNotes?: string;
  employeeJustification?: string; // Justification text written by the employee
  createdAt: string;
}

// ============================================
// FLEET MANAGEMENT TYPES
// ============================================

// ENUMS: KEYS match DB VALUES (English Codes)
export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE'
}

export const VehicleStatusLabels: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: 'Disponível',
  [VehicleStatus.IN_USE]: 'Em Uso',
  [VehicleStatus.MAINTENANCE]: 'Em Manutenção',
  [VehicleStatus.INACTIVE]: 'Inativo'
};

export enum InspectionStatus {
  OK = 'OK',
  UPCOMING = 'UPCOMING',
  EXPIRED = 'EXPIRED'
}

export const InspectionStatusLabels: Record<InspectionStatus, string> = {
  [InspectionStatus.OK]: 'OK',
  [InspectionStatus.UPCOMING]: 'Próxima',
  [InspectionStatus.EXPIRED]: 'Expirada'
};

export type VehicleExpenseCategory = 'FUEL' | 'TOLLS' | 'PARKING' | 'MAINTENANCE' | 'INSURANCE' | 'OTHER';
export const VehicleExpenseCategoryLabels: Record<VehicleExpenseCategory, string> = {
  FUEL: 'Combustível',
  TOLLS: 'Portagens',
  PARKING: 'Estacionamento',
  MAINTENANCE: 'Manutenção',
  INSURANCE: 'Seguro',
  OTHER: 'Outros'
};

export type MaintenanceType = 'INSPECTION' | 'SERVICE' | 'REPAIR' | 'TIRE_CHANGE' | 'OIL_CHANGE' | 'OTHER';
export type TripStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export const BookingStatusLabels: Record<BookingStatus, string> = {
  [BookingStatus.CONFIRMED]: 'Confirmada',
  [BookingStatus.CANCELLED]: 'Cancelada',
  [BookingStatus.COMPLETED]: 'Concluída'
};

export interface VehicleBooking {
  id: number;
  vehicleId: string;
  vehicle?: Vehicle;
  userId: number;
  user?: User;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  purpose?: string;
  notes?: string;
  status: BookingStatus;
  createdAt?: string;
}

export interface Vehicle {
  id: string; // Changed to string to match DB 'v0', 'v1'
  plate: string;
  brand: string;
  model: string;
  year?: number;
  company: Company | string;
  status: VehicleStatus;
  currentKm: number;
  assignedUserId?: number;
  assignedUser?: User;
  inspectionDate?: string;
  nextInspection?: string;
  insuranceExpiry?: string;
  photoUrl?: string;
  notes?: string;
  created_at?: string;
}

export interface Trip {
  id: number | string; // Trips might still be numbers or strings, let's allow both or check DB. Assuming auto-inc number for trips? Let's check schema. But vehicleId MUST be string.
  vehicleId: string;
  vehicle?: Vehicle;
  userId: number;
  user?: User;
  startDate: string;
  endDate?: string;
  startKm: number;
  endKm?: number;
  purpose?: string;
  destination?: string;
  startLocation?: string; // e.g. "38.71,-9.14" or address
  endLocation?: string;
  status: TripStatus;
  created_at?: string;
}

export interface VehicleExpense {
  id: number | string;
  vehicleId: string;
  vehicle?: Vehicle;
  userId: number;
  user?: User;
  tripId?: number | string;
  trip?: Trip;
  date: string;
  category: VehicleExpenseCategory;
  amount: number;
  description?: string;
  receiptUrl?: string;
  liters?: number;       // Litros abastecidos (for FUEL category)
  kmAtFuel?: number;     // Km no momento do abastecimento
  created_at?: string;
}

export interface MaintenanceRecord {
  id: number | string;
  vehicleId: string;
  vehicle?: Vehicle;
  type: MaintenanceType;
  date: string;
  km: number;
  cost?: number;
  description?: string;
  nextDueDate?: string;
  nextDueKm?: number;
  provider?: string;
  invoiceUrl?: string;
  created_at?: string;
}

// Vehicle Maintenance Checklist Types
export type MaintenanceCheckItem =
  | 'OIL_LEVEL'
  | 'COOLANT_LEVEL'
  | 'BRAKE_FLUID'
  | 'WASHER_FLUID'
  | 'BRAKE_PADS'
  | 'TIRES'
  | 'WIPERS'
  | 'OIL_LEAKS'
  | 'LIGHTS'
  | 'BATTERY'
  | 'DASHBOARD_WARNINGS'
  | 'TEST_DRIVE';

export type MaintenanceCheckStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'NOT_CHECKED';

export interface MaintenanceCheckItemData {
  status: MaintenanceCheckStatus;
  notes?: string;
}

export interface MaintenanceChecklist {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  userId: number;
  user?: User;
  date: string;
  items: Record<MaintenanceCheckItem, MaintenanceCheckItemData>;
  generalNotes?: string;
  created_at?: string;
}

export const MAINTENANCE_CHECK_ITEMS: { key: MaintenanceCheckItem; label: string }[] = [
  { key: 'OIL_LEVEL', label: 'Nível do óleo do motor' },
  { key: 'COOLANT_LEVEL', label: 'Nível de líquido refrigerante' },
  { key: 'BRAKE_FLUID', label: 'Nível de óleo dos travões' },
  { key: 'WASHER_FLUID', label: 'Nível de água no limpa vidros' },
  { key: 'BRAKE_PADS', label: 'Pastilhas de travão' },
  { key: 'TIRES', label: 'Pressão/estado dos pneus' },
  { key: 'WIPERS', label: 'Escovas limpa para-brisas' },
  { key: 'OIL_LEAKS', label: 'Fugas de óleo' },
  { key: 'LIGHTS', label: 'Luzes' },
  { key: 'BATTERY', label: 'Bateria' },
  { key: 'DASHBOARD_WARNINGS', label: 'Avarias indicadas no painel' },
  { key: 'TEST_DRIVE', label: 'Testar o carro' }
];

export interface Schedule {
  id: number;
  name: string;
  locationId?: number;
  days: {
    day: number; // 0=Sunday, 1=Monday ...
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    active: boolean;
  }[];
  tolerance?: number;
  createdAt?: string;
}

export interface SchedulePeriodLine {
  id: string;
  start: string;
  end: string;
  createAnomaly: boolean;
}

export interface SchedulePeriod {
  id: number;
  name: string;
  typology: 'WORK' | 'BREAK' | 'OTHER';
  affectedSchedules: string[]; // 'all' or specific IDs
  deductHours?: string;
  excelCode?: string;
  color?: string;
  lines: SchedulePeriodLine[];
  createdAt?: string;
}

// ============================================
// SCHEDULING MODULE TYPES
// ============================================

export interface ScheduleTemplateDay {
  day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start: string; // HH:MM
  end: string; // HH:MM
  breakStart?: string;
  breakEnd?: string;
  isOff?: boolean; // If true, this is a day off
}

export interface ScheduleTemplate {
  id: number;
  name: string;
  weeklyPattern: ScheduleTemplateDay[];
  cycleDays?: number; // Total duration of cycle (e.g., 4 or 6)
  cyclePattern?: {
    dayIndex: number; // 1-based index in cycle
    start: string;
    end: string;
    breakStart?: string;
    breakEnd?: string;
    isOff: boolean;
  }[];
  totalWeeklyHours?: number;
  createdAt?: string;
}

export interface LeaveType {
  id: number;
  name: string;
  color: string; // Hex color for calendar display
  deductsVacation: boolean;
  requiresApproval: boolean;
  createdAt?: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const LeaveStatusLabels: Record<LeaveStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado'
};

export interface Leave {
  id: number;
  userId: number;
  leaveTypeId: number;
  leaveType?: LeaveType; // Populated join
  user?: User; // Populated join
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  notes?: string;
  approvedBy?: number;
  approvedByName?: string; // Display field
  approvedAt?: string; // When approved/rejected
  rejectedReason?: string; // If rejected
  // Display convenience fields (from view)
  userName?: string;
  userCompany?: string;
  userDepartment?: string;
  leaveTypeName?: string;
  leaveTypeColor?: string;
  createdAt?: string;
  updatedAt?: string;
  // Multilevel Approval Fields
  approvalStep?: 'MANAGER' | 'HR' | 'DONE';
  managerApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  hrApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  attachmentUrl?: string;
  isWorkingAbsence?: boolean;

  // Legacy/Placeholder fields (Cleaning up if possible, keeping for safety if used elsewhere)
  backupUserId?: number;
  backupUserName?: string;
  l1ApprovedBy?: number;
  l1ApprovedByName?: string;
  l1ApprovedAt?: string;
  l2Required?: boolean;
  l2ApprovedBy?: number;
  l2ApprovedByName?: string;
  l2ApprovedAt?: string;
  approvalLevel?: 'L1' | 'L2' | 'AUTO';
  autoApproved?: boolean;
  advanceDays?: number;
  quorumPercentage?: number;
}

// ============================================
// VACATION BALANCE TYPES
// ============================================

export interface VacationBalance {
  annual: number;           // Dias anuais atribuídos
  carryover: number;        // Dias transitados do ano anterior
  adjustments: number;      // Ajustes manuais (+ ou -)
  total: number;            // Total disponível
  used: number;             // Dias gozados (passados)
  planned: number;          // Dias aprovados mas futuros
  remaining: number;        // Dias restantes para marcar
  expiringDays: number;     // Dias a expirar em breve
  expiryDate: string | null; // Data de expiração dos dias transitados
}

// ============================================
// QUORUM ANALYSIS TYPES
// ============================================

export type QuorumAlertLevel = 'ok' | 'warning' | 'critical';

export interface AbsentUserInfo {
  id: number;
  name: string;
  leaveType: string;
  leaveTypeColor: string;
  startDate: string;
  endDate: string;
}

export interface QuorumAnalysis {
  totalTeamSize: number;
  availableCount: number;
  percentAvailable: number;
  absentUsers: AbsentUserInfo[];
  alertLevel: QuorumAlertLevel;
  minQuorumPercentage: number;
}

// ============================================
// APPROVAL RULES & DELEGATION TYPES
// ============================================

export interface ApprovalRule {
  id: number;
  name: string;
  description?: string;
  minAdvanceDays: number;
  maxConcurrentAbsences: number;
  maxLeaveDays: number;
  departmentId?: number;
  leaveTypeId?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface ApprovalDelegation {
  id: number;
  delegatorId: number;
  delegateId: number;
  delegatorName?: string;
  delegateName?: string;
  departmentId?: number;
  startDate: string;
  endDate: string;
  reason?: string;
  isActive: boolean;
  createdAt?: string;
}

// ============================================
// PULSE SURVEYS & ANONYMOUS FEEDBACK
// ============================================

export type SurveyType = 'WEEKLY_PULSE' | 'ENPS_QUARTERLY';

export interface SurveyResponse {
  id: number;
  userId: number;
  surveyType: SurveyType;
  referenceDate: string; // YYYY-MM-DD
  rating: number; // 1-5 for Pulse, 1-10 for eNPS
  feedback?: string;
  createdAt?: string;
}

export type AnonymousFeedbackCategory = 'SUGGESTION' | 'CONCERN' | 'OTHER';
export type AnonymousFeedbackStatus = 'NEW' | 'IN_REVIEW' | 'ACTION_TAKEN' | 'CLOSED';

export interface AnonymousFeedback {
  id: number;
  category: AnonymousFeedbackCategory;
  content: string;
  status: AnonymousFeedbackStatus;
  hrResponse?: string;
  resolvedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// NOVAS FUNCIONALIDADES - TIPOS
// ============================================

// 1. LOGIN BIOMÉTRICO (WebAuthn)
export interface BiometricCredential {
  id: number;
  userId: number;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
  createdAt: string;
  lastUsedAt?: string;
  enabled: boolean;
}

export interface BiometricAuthChallenge {
  challenge: string;
  userId: number;
  expiresAt: string;
}

// 2. TROCA DE TURNOS
export type ShiftSwapStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'APPROVED_HR'
  | 'CANCELLED';

export interface ShiftSwap {
  id: number;
  requesterId: number;
  targetId: number;
  requesterShiftDate: string; // ISO date
  targetShiftDate: string; // ISO date
  status: ShiftSwapStatus;
  requesterNotes?: string;
  targetNotes?: string;
  hrNotes?: string;
  approvedBy?: number;
  createdAt: string;
  respondedAt?: string;
  approvedAt?: string;

  // Populated fields
  requester?: User;
  target?: User;
  approver?: User;
  validations?: ShiftSwapValidation[];
}

export interface ShiftSwapValidation {
  id: number;
  swapId: number;
  validationType: string;
  isValid: boolean;
  message?: string;
  createdAt: string;
}

export interface ShiftSwapConfig {
  enabled: boolean;
  requiresHRApproval: boolean;
  maxDaysAdvance: number;
  maxSwapsPerMonth: number;
  allowCrossDepartment: boolean;
  allowDifferentRoles: boolean;
}

// 3. DASHBOARD "HOJE NA EMPRESA"
export type AnnouncementSeverity = 'info' | 'warning' | 'urgent';

export interface CompanyAnnouncement {
  id: number;
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  createdBy: number;
  validFrom: string; // ISO date
  validUntil: string; // ISO date
  targetDepartments?: string[];
  createdAt: string;

  // Populated
  creator?: User;
}

export interface MonthlyHighlight {
  id: number;
  userId: number;
  month: string; // ISO date (first day of month)
  category: 'attendance' | 'feedback' | 'performance';
  reason: string;
  createdBy: number;
  createdAt: string;

  // Populated
  user?: User;
  creator?: User;
}

export interface TodayDashboardData {
  birthdaysToday: User[];
  absencesToday: {
    userId: number;
    userName: string;
    userPhoto: string;
    type: string;
    startDate: string;
    endDate: string;
  }[];
  newColleagues: User[];
  activeAnnouncements: CompanyAnnouncement[];
  highlightOfMonth?: {
    userId: number;
    userName: string;
    userPhoto: string;
    category: string;
    reason: string;
  };
}

// 4. QUICK ACTIONS
export type QuickActionType =
  | 'QUICK_LEAVE'
  | 'LAST_VEHICLE'
  | 'QUICK_EXPENSE'
  | 'HOUR_BANK'
  | 'QUICK_FEEDBACK';

export interface QuickLeaveRequest {
  startDate: string;
  endDate: string;
  leaveTypeId: number;
  notes?: string;
}

export interface QuickExpense {
  amount: number;
  category: string;
  description: string;
  date: string;
  receiptPhoto?: string; // base64 or URL
}

export interface QuickFeedback {
  rating: number; // 1-5
  category: string;
  message?: string;
}

// ================================================================
// FLEXIBLE APPROVAL WORKFLOW TYPES
// ================================================================

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'ESCALATED' | 'TIMEOUT';

export type ApproverRole = 'MANAGER' | 'HR' | 'DIRECTOR' | 'FINANCE' | 'DEPARTMENT_MANAGER' | 'CUSTOM';

export interface ApprovalWorkflow {
  id: number;
  leaveTypeId: number;
  name: string;
  description?: string;
  isActive: boolean;
  isParallel: boolean; // true = all approvers at once, false = sequential
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
}

export interface ApprovalStep {
  id: number;
  workflowId: number;
  stepOrder: number; // 1, 2, 3...
  stepName: string;
  approverRole: ApproverRole;
  approverUserId?: number; // Specific user (optional)
  isRequired: boolean;
  timeoutDays?: number; // Auto-escalate after X days
  escalateToUserId?: number;
  skipCondition?: Record<string, any>; // JSON conditions
  createdAt: string;
}

export interface AutoApprovalRule {
  id: number;
  leaveTypeId: number;
  maxDays: number;
  minNoticeDays: number; // Minimum advance notice
  requiresBackup: boolean;
  departmentId?: number; // Specific to department (null = all)
  conditions?: Record<string, any>; // Additional JSON conditions
  isActive: boolean;
  createdAt: string;
}

export interface LeaveApproval {
  id: number;
  leaveId: number;
  stepId: number;
  stepOrder: number;
  approverUserId?: number;
  approverName?: string;
  status: ApprovalStatus;
  notes?: string;
  respondedAt?: string;
  escalatedAt?: string;
  createdAt: string;
}



// Extended Leave interface with workflow fields
export interface LeaveWithWorkflow extends Leave {
  workflowId?: number;
  workflow?: ApprovalWorkflow;
  currentStepOrder?: number;
  isAutoApproved?: boolean;
  approvalDeadline?: string;
  approvals?: LeaveApproval[];
}

// Approval chain result
export interface ApprovalChainResult {
  canAutoApprove: boolean;
  workflow?: ApprovalWorkflow;
  steps?: ApprovalStep[];
  currentApprover?: {
    userId: number;
    name: string;
    isDelegated: boolean;
    delegateName?: string;
  };
  pendingApprovals?: LeaveApproval[];
  isComplete: boolean;
}

