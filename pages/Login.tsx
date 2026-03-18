
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, UserCircle, ArrowRight, Building2, Loader2, QrCode, Delete, ChevronLeft, Lock, Clock, LogIn, KeyRound, CheckCircle, Tablet, WifiOff, Wifi } from 'lucide-react';
import { User as UserType, Company } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole, UserSession } from '../types/auth';
import { isKioskAuthorized, authorizeKioskDevice, getKioskDevice, getKioskDaysRemaining } from '../services/sessionService';
import { kioskClockService } from '../services/kioskClockService';
import PasswordRecoveryModal from '../components/PasswordRecoveryModal';


interface LoginProps {
  users: UserType[];
  onUpdateUser: (user: UserType, persist?: boolean) => void;
  loading: boolean;
}

const Login: React.FC<LoginProps> = ({ users, onUpdateUser, loading }) => {
  const { user, login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && user) {
      console.log('[Login] User authenticated, redirecting...', { role: user.role });
      setIsLoggingIn(false); // Clean up in case admin login left it true

      // Small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        if (user.role === UserRole.ADMIN) {
          console.log('[Login] Navigating to /admin');
          navigate('/admin', { replace: true });
        } else if (user.role === UserRole.AUDITOR) {
          console.log('[Login] Navigating to /auditor');
          navigate('/auditor', { replace: true });
        } else {
          console.log('[Login] Navigating to /portal');
          navigate('/portal', { replace: true });
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [user, authLoading, navigate]);

  const [mode, setMode] = useState<'selection' | 'employee'>('employee');

  // Employee Login State
  const [step, setStep] = useState<'id' | 'pin' | 'new-pin' | 'confirm-pin'>('id');
  const [accessCode, setAccessCode] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company>(Company.SEMRUMO);

  // Admin Login State
  const [adminIdCode, setAdminIdCode] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Kiosk Mode State
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showKioskSuccess, setShowKioskSuccess] = useState(false);
  const [kioskSuccessUser, setKioskSuccessUser] = useState<string>('');
  const [kioskAction, setKioskAction] = useState<'in' | 'out'>('in');

  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Password Recovery State
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);

  // Failed login attempts counter (show PIN hint after 2 failures)
  const [failedAttempts, setFailedAttempts] = useState(0);



  // Setup connectivity listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [isOnline, setIsOnline] = useState(navigator.onLine);


  // Check if device is authorized as Kiosk on mount
  useEffect(() => {
    if (isKioskAuthorized()) {
      const device = getKioskDevice();
      setIsKioskMode(true);
      setMode('employee'); // Always show employee login in kiosk mode
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-return to ID screen after kiosk success
  useEffect(() => {
    if (showKioskSuccess) {
      const timeout = setTimeout(() => {
        setShowKioskSuccess(false);
        setKioskSuccessUser('');
        setAccessCode('');
        setPin('');
        setStep('id');
      }, 4000); // Return after 4 seconds
      return () => clearTimeout(timeout);
    }
  }, [showKioskSuccess]);


  // Pure JavaScript SHA-256 implementation for non-secure contexts (HTTP)
  const sha256_pure = (s: string): string => {
    const chrsz = 8;
    const hexcase = 0;
    const safe_add = (x: number, y: number): number => {
      const lsw = (x & 0xFFFF) + (y & 0xFFFF);
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xFFFF);
    };
    const S = (X: number, n: number): number => (X >>> n) | (X << (32 - n));
    const R = (X: number, n: number): number => (X >>> n);
    const Ch = (x: number, y: number, z: number): number => ((x & y) ^ ((~x) & z));
    const Maj = (x: number, y: number, z: number): number => ((x & y) ^ (x & z) ^ (y & z));
    const Sigma0256 = (x: number): number => (S(x, 2) ^ S(x, 13) ^ S(x, 22));
    const Sigma1256 = (x: number): number => (S(x, 6) ^ S(x, 11) ^ S(x, 25));
    const Gamma0256 = (x: number): number => (S(x, 7) ^ S(x, 18) ^ R(x, 3));
    const Gamma1256 = (x: number): number => (S(x, 17) ^ S(x, 19) ^ R(x, 10));
    const core_sha256 = (m: number[], l: number): number[] => {
      const K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
      const HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
      const W = new Array(64);
      let a, b, c, d, e, f, g, h, i, j;
      let T1, T2;
      m[l >> 5] |= 0x80 << (24 - l % 32);
      m[((l + 64 >> 9) << 4) + 15] = l;
      for (i = 0; i < m.length; i += 16) {
        a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3];
        e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
        for (j = 0; j < 64; j++) {
          if (j < 16) W[j] = m[j + i];
          else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
          T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
          T2 = safe_add(Sigma0256(a), Maj(a, b, c));
          h = g; g = f; f = e; e = safe_add(d, T1);
          d = c; c = b; b = a; a = safe_add(T1, T2);
        }
        HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
        HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
      }
      return HASH;
    };
    const str2binb = (str: string): number[] => {
      const bin = [];
      const mask = (1 << chrsz) - 1;
      for (let i = 0; i < str.length * chrsz; i += chrsz) {
        bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
      }
      return bin;
    };
    const binb2hex = (binarray: number[]): string => {
      const hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
      let str = "";
      for (let i = 0; i < binarray.length * 4; i++) {
        str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
          hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
      }
      return str;
    };
    return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
  };

  const hashPin = async (pin: string): Promise<string> => {
    try {
      // Use pure JS implementation which works in all contexts (HTTP/HTTPS)
      return sha256_pure(pin);
    } catch (e) {
      console.error("Hash error:", e);
      // SECURITY: Never return plain text PIN - throw error instead
      throw new Error('Failed to hash PIN - cannot proceed for security reasons');
    }
  };

  const handleNumpadClick = (value: string | number) => {
    setEmployeeError('');
    const val = value.toString();
    if (step === 'id') {
      if (accessCode.length < 8) setAccessCode(prev => prev + val);
    } else if (step === 'pin') {
      if (pin.length < 4) setPin(prev => prev + val);
    } else if (step === 'new-pin') {
      if (newPin.length < 4) setNewPin(prev => prev + val);
    } else if (step === 'confirm-pin') {
      if (confirmPin.length < 4) setConfirmPin(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    if (step === 'id') setAccessCode(prev => prev.slice(0, -1));
    else if (step === 'pin') setPin(prev => prev.slice(0, -1));
    else if (step === 'new-pin') setNewPin(prev => prev.slice(0, -1));
    else if (step === 'confirm-pin') setConfirmPin(prev => prev.slice(0, -1));
  };

  const performEmployeeLogin = (user: UserType, action: 'in' | 'out' = 'in') => {
    console.log('[EmployeeLogin] performEmployeeLogin called', { userId: user.id, name: user.name, isKioskMode });

    // Map string role to UserRole enum if possible, or fallback
    let role = UserRole.COLLABORATOR;
    if (user.role === 'AUDITOR' || user.role === 'Auditor') role = UserRole.AUDITOR;
    if (user.role === 'ADMIN' || user.role === 'Administrador') role = UserRole.ADMIN;

    // In Kiosk Mode: If user is ADMIN or AUDITOR, allow full login
    // Otherwise, just show success and return (check-in/out only)
    if (isKioskMode && role === UserRole.COLLABORATOR) {
      const recordClockAction = async () => {
        try {
          // 1. Fetch last log to determine action (In/Out)
          const { data: lastLogs } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_id', user.id)
            .is('check_out', null)
            .order('date', { ascending: false })
            .order('check_in', { ascending: false })
            .limit(1);

          const hasOpenLog = lastLogs && lastLogs.length > 0;
          const actionToPerform = hasOpenLog ? 'out' : 'in';

          console.log(`[EmployeeLogin] Kiosk Auto-Action: ${actionToPerform} for ${user.name}`);

          // 2. Execute via Service
          let result;
          if (actionToPerform === 'in') {
            result = await kioskClockService.clockIn(user);
          } else {
            result = await kioskClockService.clockOut(user);
          }

          if (result.success) {
            setKioskSuccessUser(user.name);
            setKioskAction(actionToPerform);
            setShowKioskSuccess(true);
          } else {
            setEmployeeError(`Erro ao registar: ${result.message}`);
          }
        } catch (err) {
          console.error('[EmployeeLogin] Kiosk action failed:', err);
          setEmployeeError('Erro de ligação ao registar ponto.');
        }
      };

      recordClockAction();
      return;
    }

    // Full login for: Normal Mode OR (Kiosk Mode + ADMIN/AUDITOR)
    console.log('[EmployeeLogin] Full login mode', { role });

    const session: UserSession = {
      id: user.id.toString(),
      name: user.name,
      role: role,
      token: 'employee-pin-session',
      permissions: []
    };

    // Call login - navigation will be handled by useEffect
    login(session);

    // NOTE: Do NOT navigate here - let the useEffect handle it
    // This prevents race conditions with multiple navigation attempts
    console.log('[EmployeeLogin] Login successful, useEffect will handle navigation');
  };

  const handleEmployeeSubmit = async () => {
    console.log('[EmployeeLogin] handleEmployeeSubmit', { step, accessCode, pinLength: pin.length });
    setEmployeeError('');

    if (step === 'id') {
      if (!accessCode) {
        console.log('[EmployeeLogin] No access code provided');
        return;
      }

      // VALIDAÇÃO CRÍTICA: Garantir que é um ID numérico válido
      const userId = parseInt(accessCode);

      if (isNaN(userId) || userId <= 0) {
        console.error('[EmployeeLogin] ID inválido (não numérico):', accessCode);
        setEmployeeError('Código de acesso inválido. Use apenas números.');
        setAccessCode('');
        return;
      }

      // Build combined user list
      const allAvailableUsers = users;

      // Try to find user by ID (garantindo comparação numérica)
      let user = allAvailableUsers.find(u => {
        // PROTEÇÃO: Garantir que user.id é número para comparação correta
        const userIdNum = typeof u.id === 'number' ? u.id : Number(u.id);

        // Detectar e alertar se houver UUID
        if (typeof u.id === 'string' && u.id.includes('-')) {
          console.error(`❌ CRÍTICO: User ID é UUID! User: ${u.name}, ID: ${u.id}`);
          // Este erro indica problema grave na base de dados
        }

        return userIdNum === userId;
      });

      if (!user && loading) {
        setEmployeeError('A carregar dados... Aguarde.');
        return;
      }

      if (user) {
        console.log('[EmployeeLogin] User found, moving to PIN step', { userId: user.id });
        setStep('pin');
        setPin('');
      } else {
        console.warn('[EmployeeLogin] User not found', { accessCode, userId });

        if (loading && allAvailableUsers.length === 0) {
          setEmployeeError('A carregar base de dados... Tente novamente em segundos.');
        } else {
          setEmployeeError('Utilizador não encontrado.');
        }
        setAccessCode('');
      }
    } else if (step === 'pin') {
      if (pin.length < 4) {
        console.log('[EmployeeLogin] PIN too short', { length: pin.length });
        return;
      }

      // VALIDAÇÃO CRÍTICA: Garantir que é um ID numérico válido
      const userId = parseInt(accessCode);

      if (isNaN(userId) || userId <= 0) {
        console.error('[EmployeeLogin] ID inválido no step PIN:', accessCode);
        setEmployeeError('Erro crítico: ID inválido.');
        setStep('id');
        setAccessCode('');
        setPin('');
        return;
      }

      // Build combined user list
      const allAvailableUsers = users;

      // Find user by ID (garantindo comparação numérica)
      let user = allAvailableUsers.find(u => {
        const userIdNum = typeof u.id === 'number' ? u.id : Number(u.id);
        return userIdNum === userId;
      });

      if (!user) {
        console.error('[EmployeeLogin] User not found at PIN step - this should not happen!');
        setEmployeeError('Erro: Utilizador não encontrado. Tente novamente.');
        setStep('id');
        setAccessCode('');
        setPin('');
        return;
      }

      console.log('[EmployeeLogin] Validating PIN for user', { userId: user.id });

      // Default PIN check logic (Hybrid: Plain text OR Hash)
      // '1111' is always treated as plain text for initial reset flow
      const inputPinHash = await hashPin(pin);
      const storedPin = user.pin;

      const isDefaultPin = pin === '1111';
      // If stored PIN is null/empty, or '1111', or matches input plain text (legacy) OR matches hash
      const isCorrect =
        !storedPin ||
        storedPin === '1111' ||
        storedPin === pin ||  // Legacy plain text check
        storedPin === inputPinHash; // Secure hash check

      if (isCorrect) {
        console.log('[EmployeeLogin] PIN correct');
        if (user.requiresNewPin || !storedPin || isDefaultPin) {
          console.log('[EmployeeLogin] User requires new PIN');
          setStep('new-pin');
          setNewPin('');
        } else {
          console.log('[EmployeeLogin] Calling performEmployeeLogin');
          performEmployeeLogin(user);
        }
      } else {
        console.warn('[EmployeeLogin] PIN incorrect');
        setFailedAttempts(prev => prev + 1);
        setEmployeeError('PIN Incorreto.');
        setPin('');
      }
    } else if (step === 'new-pin') {
      if (newPin.length === 4) {
        setStep('confirm-pin');
        setConfirmPin('');
      }
    } else if (step === 'confirm-pin') {
      if (confirmPin.length === 4) {
        if (newPin === confirmPin) {
          const userId = parseInt(accessCode);
          const user = users.find(u => u.id === userId);
          if (user) {

            // HASH THE NEW PIN BEFORE STORAGE
            const hashedNewPin = await hashPin(newPin);

            const { error } = await supabase.from('users').update({
              pin: hashedNewPin, // Store Hash
              requires_new_pin: false
            }).eq('id', user.id);

            if (!error) {
              setEmployeeError('PIN atualizado! Faça login com o novo PIN.');

              // Clear and Reset to ID step to force re-login
              setConfirmPin('');
              setNewPin('');
              setPin('');
              setAccessCode('');
              setStep('id');

              // Update local state in App just towards keeping data fresh,
              // though we are resetting flow.
              // We store the HASH locally too so the immediate login works.
              const updatedUser = { ...user, pin: hashedNewPin, requiresNewPin: false };
              onUpdateUser(updatedUser, false);

              // DO NOT performEmployeeLogin(updatedUser);
            } else {
              console.error("Error updating PIN:", error);
              setEmployeeError('Erro ao atualizar PIN.');
              setConfirmPin('');
              setNewPin('');
              setStep('new-pin');
            }
          }
        } else {
          setEmployeeError('Os PINs não coincidem.');
          setStep('new-pin');
          setNewPin('');
          setConfirmPin('');
        }
      }
    }
  };

  // Auto-submit effects — use ref to always call the latest handleEmployeeSubmit
  const isSubmittingRef = useRef(false);
  const handleEmployeeSubmitRef = useRef(handleEmployeeSubmit);
  handleEmployeeSubmitRef.current = handleEmployeeSubmit;

  useEffect(() => {
    const doSubmit = async () => {
      // CRITICAL: Check if already submitting to prevent race conditions
      if (isSubmittingRef.current) {
        console.log('[EmployeeLogin] Already submitting, ignoring duplicate');
        return;
      }

      console.log('[EmployeeLogin] Auto-submit triggered', { step });
      isSubmittingRef.current = true;

      try {
        await handleEmployeeSubmitRef.current();
      } catch (error) {
        console.error('[EmployeeLogin] Auto-submit error:', error);
      } finally {
        // CRITICAL FIX: Reset immediately, no delay
        // The 300ms delay was causing race conditions!
        isSubmittingRef.current = false;
        console.log('[EmployeeLogin] Submit complete, ready for next');
      }
    };

    // Auto-submit when PIN/new-PIN/confirm-PIN is complete (4 digits)
    if (step === 'pin' && pin.length === 4) {
      console.log('[EmployeeLogin] PIN complete, auto-submitting');
      doSubmit();
    } else if (step === 'new-pin' && newPin.length === 4) {
      console.log('[EmployeeLogin] New PIN complete, auto-submitting');
      doSubmit();
    } else if (step === 'confirm-pin' && confirmPin.length === 4) {
      console.log('[EmployeeLogin] Confirm PIN complete, auto-submitting');
      doSubmit();
    }
  }, [pin, newPin, confirmPin, step]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoggingIn) {
      console.log('[AdminLogin] Already logging in, ignoring duplicate submit');
      return;
    }

    setIsLoggingIn(true);
    setAdminError('');

    try {
      // Validate Inputs
      if (!adminIdCode || !adminPin) {
        setAdminError('Por favor preencha todos os campos.');
        return;
      }

      // Check if users are loaded (avoid intermittent failures)
      if (loading || users.length === 0) {
        setAdminError('A carregar dados... Aguarde e tente novamente.');
        return;
      }

      const userId = parseInt(adminIdCode);

      // Build combined user list
      const allAvailableUsers = users;

      // Find user by ID
      let user = allAvailableUsers.find(u =>
        u.id === userId ||
        u.id.toString() === adminIdCode
      );

      if (!user) {
        setAdminError('Utilizador não encontrado.');
        return;
      }

      // Verify PIN
      const inputPinHash = await hashPin(adminPin);
      const storedPin = user.pin;
      const isCorrect = !storedPin || storedPin === '1111' || storedPin === adminPin || storedPin === inputPinHash;

      if (!isCorrect) {
        setAdminError('PIN Incorreto.');
        return;
      }

      // Check Permissions
      const { permissionService } = await import('../services/permissionService');

      let rolePerms: string[] = [];
      try {
        rolePerms = await permissionService.getUserPermissions(user.role);
      } catch (permError) {
        console.error('[AdminLogin] Error fetching permissions:', permError);
        // Continue without permissions if offline
        rolePerms = [];
      }

      // Verify if they have ANY admin access
      const hasAdminAccess =
        user.role === UserRole.ADMIN ||
        user.role === 'Administrador' ||
        user.role === 'ADMIN' ||
        rolePerms.includes('VIEW_ADMIN') ||
        rolePerms.includes('VIEW_DASHBOARD');

      if (!hasAdminAccess) {
        setAdminError('Não tem permissões de acesso ao Backoffice.');
        return;
      }

      // Normalize role based on Role Name OR Permissions
      let sessionRole = UserRole.COLLABORATOR;
      const r = user.role;

      if (r === UserRole.AUDITOR || r === 'AUDITOR' || r === 'Auditor') {
        sessionRole = UserRole.AUDITOR;
      } else if (
        r === UserRole.ADMIN || r === 'ADMIN' || r === 'Administrador' ||
        rolePerms.includes('VIEW_ADMIN') ||
        rolePerms.includes('VIEW_DASHBOARD')
      ) {
        sessionRole = UserRole.ADMIN;
      }

      const session: UserSession = {
        id: user.id.toString(),
        name: user.name,
        role: sessionRole,
        token: 'pin-session',
        permissions: rolePerms
      };

      console.log('[AdminLogin] Login successful');

      // Call login - the useEffect will handle navigation automatically
      login(session);

      // NOTE: Navigation is handled by useEffect monitoring 'user' state
      // This prevents race conditions and double navigation

    } catch (err: any) {
      console.error('[AdminLogin] Critical error:', err);
      setAdminError(`Erro: ${err?.message || 'Erro desconhecido ao validar acesso'}`);
    } finally {
      // ALWAYS reset loading state
      setIsLoggingIn(false);
    }
  };

  const handleBack = () => {
    if (step === 'confirm-pin') {
      setStep('new-pin');
      setConfirmPin('');
    } else if (step === 'new-pin') {
      setStep('pin');
      setNewPin('');
      setConfirmPin('');
    } else if (step === 'pin') {
      setStep('id');
      setPin('');
    } else {
      setMode('selection');
      setAccessCode('');
      setPin('');
      setStep('id');
    }
  };

  // Show loading screen while data is being fetched
  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#001529] to-[#003a8c] gap-6">
        <div className="relative">
          {/* Animated background circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-blue-500/20 rounded-full animate-ping"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-blue-400/30 rounded-full animate-pulse"></div>
          </div>

          {/* Spinner */}
          <div className="relative z-10 w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl">
            <Loader2 className="h-10 w-10 text-blue-300 animate-spin" />
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-2 animate-fade-in">
          <h2 className="text-2xl font-bold text-white">A carregar sistema...</h2>
          <p className="text-blue-200/80 text-sm">Por favor aguarde enquanto carregamos os dados</p>

          {/* Loading progress indicator */}
          <div className="mt-4 flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* SEMRUMO branding */}
        <div className="absolute bottom-8 text-center">
          <p className="text-white/40 text-xs font-bold tracking-widest">SEMRUMO MY PORTAL</p>
        </div>
      </div>
    );
  }

  // --- KIOSK / CHECK-IN APP VIEW ---
  if (mode === 'employee') {
    const getStepTitle = () => {
      switch (step) {
        case 'id': return 'Identificação';
        case 'pin': return 'Código PIN';
        case 'new-pin': return 'Novo PIN';
        case 'confirm-pin': return 'Confirmar PIN';
        default: return 'Identificação';
      }
    };

    const getInputValue = () => {
      switch (step) {
        case 'id': return accessCode;
        case 'pin': return pin;
        case 'new-pin': return newPin;
        case 'confirm-pin': return confirmPin;
        default: return '';
      }
    };

    const getInputPlaceholder = () => {
      switch (step) {
        case 'id': return "Número Colaborador (ID)";
        default: return "Introduza o PIN";
      }
    };

    return (
      <div className="min-h-screen bg-[#001529] flex flex-col-reverse md:flex-row overflow-hidden font-sans">

        {/* Kiosk Success Overlay */}
        {showKioskSuccess && (
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-emerald-600 to-emerald-800 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-scale-in">
              <CheckCircle className="text-emerald-600" size={56} />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 text-center">
              {kioskAction === 'in' ? 'Entrada Registada' : 'Saída Registada'}
            </h2>
            <p className="text-2xl md:text-3xl text-emerald-200 mb-8">{kioskSuccessUser}</p>
            <p className="text-lg text-white/60">
              {currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <div className="mt-8 flex items-center gap-2 text-white/40 text-sm">
              <Loader2 size={16} className="animate-spin" />
              A voltar ao ecrã inicial...
            </div>
          </div>
        )}

        {/* Left Side (Info & Clock) */}
        <div className="w-full md:w-1/2 p-6 md:p-16 flex flex-col justify-between relative z-10 bg-gradient-to-br from-[#003a8c] to-[#001529] min-h-[300px] md:min-h-screen border-t md:border-t-0 md:border-r border-white/10 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500 rounded-full blur-[150px]"></div>
          </div>

          {/* Connection & Kiosk Mode Indicator */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${
              isOnline
                ? 'text-green-400 bg-green-500/10 border-green-500/20'
                : 'text-orange-400 bg-orange-500/10 border-orange-500/20 animate-pulse'
            }`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>

            {/* Kiosk Mode Indicator */}
            {isKioskMode && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Tablet size={14} />
                MODO KIOSK
              </div>
            )}
          </div>

          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 md:mb-8 backdrop-blur-sm border border-white/10 shadow-lg">
              <Clock className="text-blue-300" size={24} />
            </div>
            <h1 className="text-3xl md:text-6xl font-bold text-white leading-tight mb-4 drop-shadow-lg">
              SEMRUMO<br /><span className="text-blue-400">MY PORTAL</span>
            </h1>
            <p className="text-blue-200 text-sm md:text-lg max-w-md leading-relaxed opacity-80">
              {isKioskMode
                ? 'Kiosk de Ponto. Introduza o seu ID e PIN para registar entrada ou saída.'
                : 'Portal de colaborador. Introduza o seu código para iniciar turno ou consultar o seu perfil.'}
            </p>

            {/* PIN 1234 Info Banner - Only shown after 2 failed login attempts */}
            {failedAttempts >= 2 && (
              <div className="mt-6 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-2 border-emerald-400/30 rounded-2xl p-4 backdrop-blur-md animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center">
                      <Lock className="text-white" size={20} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-emerald-100 font-bold text-sm mb-1 flex items-center gap-2">
                      ℹ️ Primeiro Acesso
                    </h3>
                    <p className="text-emerald-200/90 text-xs leading-relaxed">
                      Se é o seu primeiro login, use o PIN: <span className="font-bold text-white bg-emerald-600/50 px-2 py-0.5 rounded">1234</span>
                    </p>
                    <p className="text-emerald-300/70 text-[10px] mt-1">
                      Será pedido para criar um novo PIN personalizado
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 md:mt-12">
            <div className="text-6xl md:text-[140px] font-bold text-[#00274d] leading-none select-none tracking-tighter opacity-80 md:opacity-100 mix-blend-screen">
              {currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Hide Admin button in Kiosk mode */}
          {!isKioskMode && (
            <button
              onClick={() => setMode('selection')}
              className="absolute bottom-6 left-6 flex items-center gap-2 text-white/30 hover:text-white/80 transition-colors text-xs md:text-sm font-bold uppercase tracking-widest z-20"
            >
              <ShieldCheck size={16} /> Admin Access
            </button>
          )}
        </div>

        {/* Right Side (Keypad) */}
        <div className="w-full md:w-1/2 bg-[#001529] p-4 md:p-12 flex flex-col items-center justify-center relative flex-1">

          <div className="w-full max-w-xs space-y-6 md:space-y-8 animate-fade-in mt-4 md:mt-0">
            <div className="text-center">
              <h2 className="text-white text-lg md:text-xl font-bold mb-2 transition-all">
                {getStepTitle()}
              </h2>
              <div className={`h-1 mx-auto rounded-full transition-all duration-500 ${step === 'id' ? 'w-8 bg-blue-500' : 'w-16 bg-emerald-500'}`}></div>
            </div>

            {/* Input Display */}
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"></div>
              <input
                type={step === 'id' ? "text" : "password"}
                readOnly
                value={getInputValue()}
                placeholder={getInputPlaceholder()}
                className={`relative w-full bg-[#002140] border rounded-2xl px-6 py-4 text-center text-xl text-white font-medium placeholder-gray-600 focus:outline-none transition-all shadow-xl tracking-widest ${step === 'id' ? 'border-[#1e3a5f]' : 'border-emerald-900/50 text-emerald-400'}`}
              />
              {step !== 'id' && (
                <button onClick={handleBack} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                  <ChevronLeft size={20} />
                </button>
              )}
            </div>

            {/* Inline Error Message */}
            {employeeError && (
              <p className="text-red-400 text-xs text-center font-bold bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20 animate-fade-in">
                {employeeError}
              </p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumpadClick(num)}
                  className="group w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1e3a5f]/40 hover:bg-[#3b82f6] active:bg-[#2563eb] text-white text-3xl md:text-4xl font-medium flex items-center justify-center transition-all hover:scale-105 active:scale-95 mx-auto border border-white/5 hover:border-blue-400 shadow-lg"
                >
                  {num}
                </button>
              ))}
              <button
                className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-[#1e3a5f]/20 text-gray-500 text-xl font-bold flex items-center justify-center cursor-default mx-auto"
              >
              </button>
              <button
                onClick={() => handleNumpadClick(0)}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1e3a5f]/40 hover:bg-[#3b82f6] text-white text-3xl md:text-4xl font-medium flex items-center justify-center transition-all hover:scale-105 active:scale-95 mx-auto border border-white/5"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1e3a5f]/40 hover:bg-red-500/80 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 mx-auto border border-white/5"
              >
                <Delete size={20} />
              </button>
            </div>

            {/* Submit Button (Only visible on ID step, PIN auto-submits) */}
            {step === 'id' && (
              <>
                <button
                  onClick={handleEmployeeSubmit}
                  disabled={accessCode.length === 0}
                  className={`w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold h-16 md:h-20 rounded-2xl text-xl tracking-wide shadow-lg shadow-blue-900/50 transition-all active:scale-[0.98] uppercase flex items-center justify-center gap-3 ${accessCode.length === 0 ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
                >
                  Seguinte <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPasswordRecovery(true)}
                  className="w-full text-sm text-blue-300 hover:text-blue-100 font-medium py-3 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <KeyRound size={14} />
                  Esqueci a minha password
                </button>
              </>
            )}

            {/* Disclaimer for New PIN */}
            {(step === 'new-pin' || step === 'confirm-pin') && (
              <p className="text-emerald-400 text-xs text-center font-medium animate-pulse">
                Defina um novo PIN de 4 dígitos para a sua segurança.
              </p>
            )}
          </div>
        </div>

        {/* Password Recovery Modal */}
        <PasswordRecoveryModal
          isOpen={showPasswordRecovery}
          onClose={() => setShowPasswordRecovery(false)}
        />
      </div>
    );
  }

  // --- ADMIN VIEW ---
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        <div className="w-full md:w-1/2 bg-blue-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none"><ShieldCheck size={200} /></div>
          <div className="relative z-10">
            <div className="bg-white/10 w-fit p-3 rounded-xl mb-6 backdrop-blur-sm shadow-sm border border-white/20">
              <Building2 size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-2">SEMRUMO</h1>
            <h2 className="text-xl font-bold text-blue-200 mb-2">MY PORTAL</h2>
            <p className="text-blue-200/60 tracking-widest text-xs font-bold uppercase mt-4">Backoffice Administrativo</p>
          </div>
          <button
            onClick={() => setMode('employee')}
            className="relative z-10 mt-8 text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg flex items-center gap-2 w-fit transition-all border border-white/10"
          >
            <ChevronLeft size={16} /> Voltar ao Kiosk
          </button>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="space-y-6 animate-slide-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <KeyRound size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Autenticação</h2>
              <p className="text-sm text-gray-500">Insira as suas credenciais de acesso.</p>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <div className="relative mb-4">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={adminIdCode}
                    onChange={(e) => { setAdminIdCode(e.target.value); setAdminError(''); }}
                    placeholder="Nº de Colaborador / ID"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800 shadow-inner"
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => { setAdminPin(e.target.value); setAdminError(''); }}
                    placeholder="PIN de Acesso"
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono tracking-widest text-lg shadow-inner"
                  />
                </div>
              </div>

              {adminError && <p className="text-red-500 text-xs mt-2 text-center font-bold bg-red-50 py-1 rounded">{adminError}</p>}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoggingIn && <Loader2 size={18} className="animate-spin" />}
                {isLoggingIn ? 'A verificar...' : 'Confirmar Acesso'}
              </button>

              <button
                type="button"
                onClick={() => setShowPasswordRecovery(true)}
                className="w-full text-sm text-gray-600 hover:text-blue-600 font-medium py-2 transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound size={14} />
                Esqueci a minha password
              </button>
            </form>

            {/* Kiosk Authorization Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Tablet size={18} />
                  <span className="text-sm font-medium">Modo Kiosk</span>
                </div>
                {isKioskAuthorized() ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    ✓ Autorizado ({getKioskDaysRemaining()} dias)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    Não autorizado
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Autorizar este dispositivo como Kiosk de ponto por 30 dias?')) {
                    authorizeKioskDevice('admin-manual');
                    alert('Dispositivo autorizado! Reinicie a página para entrar em Modo Kiosk.');
                    window.location.reload();
                  }
                }}
                className="w-full text-sm text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Tablet size={16} />
                {isKioskAuthorized() ? 'Renovar Autorização' : 'Autorizar como Kiosk'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Recovery Modal */}
      <PasswordRecoveryModal
        isOpen={showPasswordRecovery}
        onClose={() => setShowPasswordRecovery(false)}
      />
    </div >
  );
};

export default Login;
