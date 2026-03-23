import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, UserCircle, ArrowRight, Loader2, Delete, ChevronLeft, Clock, LogIn, CheckCircle, WifiOff, Wifi, AlertTriangle, Building2, KeyRound, Info } from 'lucide-react';
import { User as UserType, Company } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { UserRole } from '../types/auth';
import { isKioskAuthorized } from '../services/sessionService';
import { kioskClockService } from '../services/kioskClockService';
import PasswordRecoveryModal from '../components/PasswordRecoveryModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

interface LoginProps {
  // onUpdateUser removido conforme solicitado
}

const Login: React.FC<LoginProps> = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Kiosk Mode Detection
  const isKioskMode = location.search.includes('kiosk=true');

  // Login Type Toggle
  const [loginType, setLoginType] = useState<'colaborador' | 'administrador'>('colaborador');

  useEffect(() => {
    if (!authLoading && user) {
      if (isKioskMode) return;

      if (loginType === 'administrador') {
        const isAdminUser = user.role === UserRole.ADMIN ||
                           user.role === 'Administrador' ||
                           user.role === 'RH' ||
                           user.role === 'Diretor de Unidade' ||
                           user.role === 'Responsável de Departamento';

        if (isAdminUser) {
          navigate('/admin', { replace: true });
        } else if (user.role === UserRole.AUDITOR) {
          navigate('/auditor', { replace: true });
        } else {
          navigate('/portal', { replace: true });
        }
      } else {
        navigate('/portal', { replace: true });
      }
    }
  }, [user, authLoading, navigate, isKioskMode, loginType]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Employee & Admin Shared Login State (Numpad)
  const [step, setStep] = useState<'id' | 'pin' | 'new-pin' | 'confirm-pin'>('id');
  const [accessCode, setAccessCode] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  
  // New States for Authentication
  const [userEmail, setUserEmail] = useState('');
  const [requiresNewPin, setRequiresNewPin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');

  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Kiosk Mode State
  const [showKioskSuccess, setShowKioskSuccess] = useState(false);
  const [kioskSuccessUser, setKioskSuccessUser] = useState<string>('');
  const [kioskAction, setKioskAction] = useState<'in' | 'out'>('in');

  // Status State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showKioskSuccess) {
      const timeout = setTimeout(() => {
        setShowKioskSuccess(false);
        setStep('id');
        setAccessCode('');
        setPin('');
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [showKioskSuccess]);

  const handleNumpadClick = (value: string | number) => {
    setEmployeeError('');
    const val = value.toString();
    if (step === 'id') {
      if (accessCode.length < 8) setAccessCode(prev => prev + val);
    } else if (step === 'pin') {
      if (pin.length < 6) setPin(prev => prev + val);
    } else if (step === 'new-pin') {
      if (newPin.length < 6) setNewPin(prev => prev + val);
    } else if (step === 'confirm-pin') {
      if (confirmPin.length < 6) setConfirmPin(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    if (step === 'id') setAccessCode(prev => prev.slice(0, -1));
    else if (step === 'pin') setPin(prev => prev.slice(0, -1));
    else if (step === 'new-pin') setNewPin(prev => prev.slice(0, -1));
    else if (step === 'confirm-pin') setConfirmPin(prev => prev.slice(0, -1));
  };

  const performKioskAction = async (userData: any) => {
    try {
      const { data: lastLogs } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userData.id)
        .is('check_out', null)
        .order('date', { ascending: false })
        .order('check_in', { ascending: false })
        .limit(1);

      const actionToPerform = lastLogs && lastLogs.length > 0 ? 'out' : 'in';

      let result;
      if (actionToPerform === 'in') {
        result = await kioskClockService.clockIn(userData);
      } else {
        result = await kioskClockService.clockOut(userData);
      }

      if (result.success) {
        setKioskSuccessUser(userData.name);
        setKioskAction(actionToPerform);
        setShowKioskSuccess(true);
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 3000);
      } else {
        setEmployeeError(`Erro ao registar: ${result.message}`);
      }
    } catch (err) {
      console.error('[Kiosk] Error:', err);
      setEmployeeError('Erro ao registar ponto.');
    }
  };

  const handleEmployeeSubmit = async () => {
    setEmployeeError('');

    if (step === 'id') {
      if (!accessCode) return;
      const userId = parseInt(accessCode);
      if (isNaN(userId)) {
        setEmployeeError('ID inválido.');
        return;
      }

      setIsLoggingIn(true);
      try {
        // FLUXO DO STEP 'id' (Validar ID e obter Email via RPC Seguro)
        const { data, error } = await supabase.rpc('get_user_for_login', { p_user_id: parseInt(accessCode) });

        if (error || !data || data.length === 0) {
          setEmployeeError('Utilizador não encontrado.');
          return;
        }

        const user = data[0];

        // Validar permissões de admin (se o toggle estiver em administrador)
        if (loginType === 'administrador') {
          const isAdmin = ['ADMIN', 'Administrador', 'RH', 'Diretor de Unidade', 'Responsável de Departamento'].includes(user.role);
          if (!isAdmin) {
            setEmployeeError('Acesso restrito a administradores.');
            return;
          }
        }

        // Se o email vier vazio da DB, usamos o fallback
        const email = user.email || `user${parseInt(accessCode)}@myportal.internal`;
        
        setUserEmail(email);
        setRequiresNewPin(user.requires_new_pin);
        setCurrentUserId(parseInt(accessCode));
        // Nota: Nome do utilizador será obtido após o login bem-sucedido para manter RLS restrito
        setStep('pin');
        setPin('');
      } catch (err) {
        setEmployeeError('Erro de ligação.');
      } finally {
        setIsLoggingIn(false);
      }
    } else if (step === 'pin') {
      if (pin.length < 6) return;

      setIsLoggingIn(true);
      // Rule 3: authService.login
      const result = await authService.login({ email: userEmail, password: pin });
      setIsLoggingIn(false);

      if (result.success) {
        setCurrentUserName(result.user.name);
        const isDefaultPin = ['123456', '1111', '1234'].includes(pin);
        if (requiresNewPin || isDefaultPin) {
          setStep('new-pin');
          setNewPin('');
        } else {
          if (isKioskMode) {
            performKioskAction(result.user);
          }
          // Redirecionamento normal é via AuthContext useEffect
        }
      } else {
        setEmployeeError(result.error || 'PIN Incorreto.');
        setPin('');
      }
    } else if (step === 'new-pin') {
      if (newPin.length === 6) {
        setStep('confirm-pin');
        setConfirmPin('');
      }
    } else if (step === 'confirm-pin') {
      if (confirmPin.length === 6) {
        if (newPin === confirmPin) {
          try {
            const { error: authError } = await supabase.auth.updateUser({
              password: newPin
            });
            if (authError) throw authError;

            await supabase
              .from('users')
              .update({ requires_new_pin: false })
              .eq('id', currentUserId);

            if (isKioskMode) {
              performKioskAction({ id: currentUserId, name: currentUserName });
            } else {
              setEmployeeError('✅ PIN atualizado com sucesso!');
              setTimeout(() => window.location.reload(), 2000);
            }
          } catch (err) {
            setEmployeeError('Erro ao atualizar PIN.');
          }
        } else {
          setEmployeeError('Os PINs não coincidem.');
          setStep('new-pin');
          setNewPin('');
        }
      }
    }
  };

  useEffect(() => {
    if ((step === 'pin' && pin.length === 6) ||
        (step === 'new-pin' && newPin.length === 6) ||
        (step === 'confirm-pin' && confirmPin.length === 6)) {
      handleEmployeeSubmit();
    }
  }, [pin, newPin, confirmPin, step]);

  const handleBack = () => {
    if (step === 'confirm-pin') setStep('new-pin');
    else if (step === 'new-pin') setStep('pin');
    else if (step === 'pin') { setStep('id'); setPin(''); }
    else { setAccessCode(''); setStep('id'); }
  };

  const getInputValue = () => {
    if (step === 'id') return accessCode;
    if (step === 'pin') return pin;
    if (step === 'new-pin') return newPin;
    if (step === 'confirm-pin') return confirmPin;
    return '';
  };
  return (
    <div className="min-h-screen w-full bg-[#020a16] bg-gradient-to-br from-[#041d3d] to-[#020a16] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden selection:bg-blue-500/30">
      {/* Kiosk Success Overlay */}
      {showKioskSuccess && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#064e3b] to-[#065f46] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl scale-110">
            <CheckCircle className="text-emerald-600" size={56} />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 text-center">
            {kioskAction === 'in' ? 'Entrada Registada' : 'Saída Registada'}
          </h2>
          <p className="text-2xl md:text-3xl text-emerald-200 mb-8">{kioskSuccessUser}</p>
          <div className="mt-8 flex items-center gap-2 text-white/40 text-sm">
            <Loader2 size={16} className="animate-spin" />
            A voltar ao ecrã inicial...
          </div>
        </div>
      )}

      {/* Header - Compact */}
      <div className="flex items-center justify-between px-6 sm:px-10 py-4 sm:py-6 absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-md">
            <Clock className="text-white/70" size={20} sm:size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide leading-tight">SEMRUMO</h1>
            <p className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mt-0.5">MY PORTAL</p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-8">
          <div className={`hidden sm:flex items-center gap-2.5 text-[10px] font-black px-4 py-2 rounded-full border ${isOnline ? 'text-[#14b8a6] bg-[#042f2e] border-[#14b8a6]/20' : 'text-orange-400 bg-orange-400/10 border-orange-400/20'} shadow-inner`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#14b8a6] shadow-[0_0_8px_#14b8a6]' : 'bg-orange-400'}`}></span>
            ONLINE <span className="text-white/30 ml-1">v56</span>
          </div>
          <div className="text-white/90 text-4xl sm:text-6xl font-extralight tracking-tight tabular-nums">
            {currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Main Login Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10 pt-20 sm:pt-24 md:pt-16 w-full">
        <div className="w-full max-w-[400px] sm:max-w-[440px] lg:max-w-[420px] mx-auto min-h-0 flex flex-col justify-center">
            <div className="w-full">
              {/* Login Type Selector */}
              {step === 'id' && !isKioskMode && (
                <div className="flex w-full bg-[#132742] border border-[#1e3a5f] p-1.5 rounded-2xl mb-5 sm:mb-6 md:mb-5">
                  <button 
                    onClick={() => setLoginType('colaborador')}
                    className={`flex-1 flex justify-center items-center gap-2 py-3 sm:py-3.5 md:py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-xs transition-colors ${loginType === 'colaborador' ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-400 hover:text-white/80'}`}
                  >
                    <UserCircle size={18} />
                    Colaborador
                  </button>
                  <button 
                    onClick={() => setLoginType('administrador')}
                    className={`flex-1 flex justify-center items-center gap-2 py-3 sm:py-3.5 md:py-2.5 rounded-xl font-bold text-xs sm:text-sm md:text-xs transition-colors ${loginType === 'administrador' ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-400 hover:text-white/80'}`}
                  >
                    <Building2 size={18} />
                    Administrador
                  </button>
                </div>
              )}

              {/* Header inside Form (only if not ID step) */}
              {step !== 'id' && (
                <div className="text-center mb-4">
                  <button onClick={handleBack} className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-colors mb-2 group">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                    <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
                  </button>
                </div>
              )}

              {/* Input Display Area */}
              <div className="relative mb-5 sm:mb-8 md:mb-5">
                <div className={`w-full h-16 sm:h-24 md:h-[72px] bg-[#0a1628]/40 border ${employeeError ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-[#1e3a5f] shadow-inner'} rounded-2xl flex items-center justify-center transition-all duration-300`}>
                  {getInputValue() ? (
                    <div className="text-4xl sm:text-5xl md:text-4xl tracking-[0.35em] font-bold text-white tabular-nums flex items-center">
                      {step === 'id' ? (accessCode || '').slice(0, 8) : pin ? '••••••'.slice(0, pin.length) : ''}
                    </div>
                  ) : (
                    <span className="text-sm sm:text-base md:text-sm font-semibold text-slate-400/80 uppercase tracking-widest">
                      {step === 'id' ? 'Número Colaborador (ID)' : 'Introduza o PIN'}
                    </span>
                  )}
                </div>
                {isLoggingIn && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#3b82f6]">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Error Message */}
              <div className={`transition-all duration-300 overflow-hidden ${employeeError ? 'max-h-20 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[10px] flex items-center gap-2 text-red-400 text-xs font-bold justify-center w-full">
                  <AlertTriangle size={16} className="shrink-0" />
                  {employeeError}
                </div>
              </div>

              {/* Numpad Grid */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-3 touch-manipulation">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button key={n} onClick={() => handleNumpadClick(n)} className="h-16 sm:h-[104px] md:h-[80px] rounded-[14px] bg-[#10233b] hover:bg-[#183252] active:scale-[0.96] active:bg-[#1d4ed8]/40 text-[32px] sm:text-[44px] md:text-[36px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] md:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center select-none">
                    {n}
                  </button>
                ))}
                
                {/* 0 and Backspace */}
                <button onClick={() => handleNumpadClick(0)} className="col-start-2 h-16 sm:h-[104px] md:h-[80px] rounded-[14px] bg-[#10233b] hover:bg-[#183252] active:scale-[0.96] active:bg-[#1d4ed8]/40 text-[32px] sm:text-[44px] md:text-[36px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] md:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center select-none">
                  0
                </button>
                
                <button onClick={handleBackspace} className="col-start-3 h-16 sm:h-[104px] md:h-[80px] rounded-[14px] bg-[#1e1c2e] hover:bg-red-500/20 active:scale-[0.96] flex items-center justify-center text-red-500 shadow-[0_4px_16px_rgba(0,0,0,0.2)] md:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all select-none">
                  <Delete size={32} sm:size={40} md:size={32} strokeWidth={2.5} />
                </button>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleEmployeeSubmit}
                disabled={isLoggingIn || (step === 'id' && !accessCode)}
                className="w-full h-14 sm:h-[80px] md:h-[64px] mt-6 sm:mt-8 md:mt-5 rounded-2xl bg-[#1d4ed8] hover:bg-[#2563eb] active:scale-[0.98] text-white flex items-center justify-center gap-3 text-lg sm:text-xl md:text-lg font-bold transition-all shadow-lg disabled:shadow-none disabled:opacity-50 disabled:bg-[#132742] disabled:text-slate-500 select-none"
              >
                <span className="tracking-wide">SEGUINTE</span>
                <ArrowRight size={20} sm:size={24} md:size={20} />
              </button>

              {/* Footer Links */}
              <div className="flex flex-col items-center pt-5 pb-2">
                <button 
                  onClick={() => setShowPasswordRecovery(true)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-all text-[11px] font-medium group"
                >
                  <KeyRound size={12} className="group-hover:rotate-12 transition-transform" />
                   Esqueceu o PIN?
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* Floating Action Buttons in corners */}
      <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 flex gap-3 z-20">
        <button
          onClick={() => window.open(import.meta.env.VITE_EMERGENCY_FALLBACK_URL || '/EMERGENCY_FALLBACK_PAGE.html', '_blank')}
          className="w-10 h-10 sm:w-11 sm:h-11 bg-[#1e1c2e] border border-red-500/10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all shadow-lg"
          title="Limpeza de Cache de Emergência"
        >
          <AlertTriangle size={18} />
        </button>
        <button 
          onClick={() => setShowPrivacyPolicy(true)}
          className="w-10 h-10 sm:w-11 sm:h-11 bg-[#16273f] border border-blue-500/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1e3a5f] transition-all shadow-lg"
          title="Política de Privacidade (RGPD)"
        >
          <Info size={18} />
        </button>
      </div>

      <PasswordRecoveryModal isOpen={showPasswordRecovery} onClose={() => setShowPasswordRecovery(false)} />
      {showPrivacyPolicy && (
        <PrivacyPolicyModal 
          onAccept={() => setShowPrivacyPolicy(false)}
          onDecline={() => setShowPrivacyPolicy(false)}
        />
      )}
    </div>
  );
};

export default Login;
