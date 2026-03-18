
import { User, UserStatus, Company, OnboardingTask, AttendanceConfig, Absence, AbsenceStatus, AbsenceType, TimeLog, TimeLogStatus, InternalMessage, AppEvent, Expense, ExpenseStatus, ExpenseCategory } from './types';

export const DEFAULT_ONBOARDING_TASKS: OnboardingTask[] = [
  { id: '1', label: 'Assinatura de Contrato', completed: false },
  { id: '2', label: 'Entrega de Equipamento', completed: false },
  { id: '3', label: 'Configuração de Email', completed: false },
  { id: '4', label: 'Formação de Segurança', completed: false }
];

export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  restriction: 'NONE',
  allowedIps: [],
  allowedLocations: []
};


// Roles with unrestricted visibility (can see ALL collaborators)
export const FULL_ACCESS_ROLES: string[] = [
  'ADMIN',
  'Administrador',
  'CEO',
  'RH',
  'Recursos Humanos'
];

// Mock data removed. Application now uses Supabase database.

