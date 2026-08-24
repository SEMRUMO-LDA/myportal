/**
 * Demo Mode Service
 * 
 * Allows testing the full MYPORTAL app without a live Supabase database.
 * Activated via VITE_DEMO_MODE=true in .env
 * 
 * Provides:
 * - Mock user data with realistic IDs
 * - Local PIN validation
 * - Persistent demo session via localStorage
 */

import { UserRole } from '../types/auth';
import type { UserSession } from '../types/auth';

// ─── Configuration ───────────────────────────────────────────────
const DEMO_STORAGE_KEY = 'myportal_demo_session';

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

// ─── Demo Users Database ─────────────────────────────────────────
export interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: string;
  pin: string;
  company: string;
  department: string;
  requiresNewPin: boolean;
  workStartTime: string;
  workEndTime: string;
  lunchStartTime: string;
  lunchEndTime: string;
  photoUrl: string;
  status: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: 73,
    name: 'Tiago Pacheco',
    email: 'tiago@semrumo.eu',
    role: 'ADMIN',
    pin: '000000',
    company: 'SEMRUMO',
    department: 'Administração',
    requiresNewPin: false,
    workStartTime: '09:00',
    workEndTime: '18:00',
    lunchStartTime: '13:00',
    lunchEndTime: '14:00',
    photoUrl: 'https://picsum.photos/200/200?random=73',
    status: 'ACTIVE',
  },
  {
    id: 1,
    name: 'Maria Silva',
    email: 'maria@semrumo.eu',
    role: 'Colaborador',
    pin: '123456',
    company: 'SEMRUMO',
    department: 'Operações',
    requiresNewPin: false,
    workStartTime: '08:00',
    workEndTime: '17:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
    photoUrl: 'https://picsum.photos/200/200?random=1',
    status: 'ACTIVE',
  },
  {
    id: 2,
    name: 'João Santos',
    email: 'joao@semrumo.eu',
    role: 'Colaborador',
    pin: '123456',
    company: 'SEMRUMO',
    department: 'Logística',
    requiresNewPin: false,
    workStartTime: '07:00',
    workEndTime: '16:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
    photoUrl: 'https://picsum.photos/200/200?random=2',
    status: 'ACTIVE',
  },
  {
    id: 10,
    name: 'Ana Costa',
    email: 'ana@semrumo.eu',
    role: 'RH',
    pin: '111111',
    company: 'SEMRUMO',
    department: 'Recursos Humanos',
    requiresNewPin: false,
    workStartTime: '09:00',
    workEndTime: '18:00',
    lunchStartTime: '13:00',
    lunchEndTime: '14:00',
    photoUrl: 'https://picsum.photos/200/200?random=10',
    status: 'ACTIVE',
  },
];

// ─── Demo User Lookup ────────────────────────────────────────────

/**
 * Find a demo user by their numeric ID
 */
export function getDemoUserById(id: number): DemoUser | null {
  return DEMO_USERS.find(u => u.id === id) || null;
}

/**
 * Get all demo users
 */
export function getDemoUsers(): DemoUser[] {
  return [...DEMO_USERS];
}

/**
 * Validate demo login credentials
 * @returns The user if valid, null if invalid PIN, undefined if user not found
 */
export function validateDemoLogin(
  userId: number,
  pin: string
): { success: true; user: DemoUser } | { success: false; error: string } {
  const user = getDemoUserById(userId);

  if (!user) {
    return { success: false, error: 'Utilizador não encontrado.' };
  }

  if (user.pin !== pin) {
    return { success: false, error: 'PIN Incorreto.' };
  }

  return { success: true, user };
}

// ─── Demo Session Management ─────────────────────────────────────

export interface DemoSession {
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  loginAt: number;
}

/**
 * Save a demo session to localStorage
 */
export function saveDemoSession(user: DemoUser): void {
  const session: DemoSession = {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    loginAt: Date.now(),
  };
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session));
  console.log('[DemoMode] Session saved for:', user.name);
}

/**
 * Restore a demo session from localStorage
 */
export function getDemoSession(): DemoSession | null {
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return null;
    const session: DemoSession = JSON.parse(stored);
    // Session expires after 24 hours
    if (Date.now() - session.loginAt > 24 * 60 * 60 * 1000) {
      clearDemoSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Clear the demo session
 */
export function clearDemoSession(): void {
  localStorage.removeItem(DEMO_STORAGE_KEY);
  console.log('[DemoMode] Session cleared');
}

/**
 * Convert a DemoUser to a UserSession for AuthContext
 */
export function demoUserToSession(user: DemoUser): UserSession {
  const normalizedRole = user.role.toUpperCase();
  let role: UserRole;
  if (['ADMIN', 'ADMINISTRADOR', 'RH', 'DIRETOR DE UNIDADE', 'RESPONSÁVEL DE DEPARTAMENTO'].includes(normalizedRole)) {
    role = UserRole.ADMIN;
  } else if (normalizedRole === 'AUDITOR') {
    role = UserRole.AUDITOR;
  } else {
    role = UserRole.COLLABORATOR;
  }

  return {
    id: String(user.id),
    name: user.name,
    role,
    permissions: role === UserRole.ADMIN ? ['*'] : [],
    email: user.email,
    token: `demo-token-${user.id}`,
    requiresNewPin: user.requiresNewPin,
  };
}
