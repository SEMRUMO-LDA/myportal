/**
 * LoginV2 Component
 * Refactored, modular login system with clean architecture
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, KeyRound, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLoginFlow } from '../hooks/useLoginFlow';
import { Numpad } from '../components/login/Numpad';
import { LoginModeToggle } from '../components/login/LoginModeToggle';
import { LoginHeader } from '../components/login/LoginHeader';

// Component for PIN dots visualization
const PinDots: React.FC<{ length: number; maxLength: number }> = ({ length, maxLength }) => (
  <div className="flex gap-2 justify-center my-4">
    {Array.from({ length: maxLength }).map((_, i) => (
      <div
        key={i}
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          i < length
            ? 'bg-white scale-110'
            : 'bg-white/20 scale-90'
        }`}
      />
    ))}
  </div>
);

const LoginV2: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { state, actions } = useLoginFlow();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline] = useState(navigator.onLine);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      console.log('[LoginV2] User already authenticated, redirecting...');
      const isAdmin = user.role === 'ADMIN' || user.role?.includes('Responsável');
      navigate(isAdmin ? '/admin' : '/portal', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Auto-submit when PIN/ID is complete
  useEffect(() => {
    const shouldAutoSubmit =
      (state.step === 'id' && state.userId.length === 8) ||
      (state.step === 'pin' && state.pin.length === 6) ||
      (state.step === 'new-pin' && state.newPin.length === 6) ||
      (state.step === 'confirm-pin' && state.confirmPin.length === 6);

    if (shouldAutoSubmit && !state.isLoading) {
      actions.submitStep();
    }
  }, [state.userId, state.pin, state.newPin, state.confirmPin, state.step, state.isLoading]);

  // Get current input value
  const getCurrentValue = () => {
    switch (state.step) {
      case 'id': return state.userId;
      case 'pin': return state.pin;
      case 'new-pin': return state.newPin;
      case 'confirm-pin': return state.confirmPin;
      default: return '';
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (state.step) {
      case 'id': return 'Identificação';
      case 'pin': return 'Código PIN';
      case 'new-pin': return 'Novo PIN';
      case 'confirm-pin': return 'Confirmar PIN';
      default: return '';
    }
  };

  // Get placeholder text
  const getPlaceholder = () => {
    switch (state.step) {
      case 'id': return 'Número do Colaborador';
      case 'pin': return 'Introduza o PIN (6 dígitos)';
      case 'new-pin': return 'Defina novo PIN (6 dígitos)';
      case 'confirm-pin': return 'Confirme o novo PIN';
      default: return '';
    }
  };

  // Show PIN dots for PIN steps
  const showPinDots = state.step !== 'id';

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0d1b2a] relative">
      {/* Header */}
      <LoginHeader isOnline={isOnline} currentTime={currentTime} />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">

            {/* Mode Toggle - Only on ID step */}
            {state.step === 'id' && (
              <LoginModeToggle
                mode={state.mode}
                onChange={actions.setMode}
                disabled={state.isLoading}
              />
            )}

            {/* Step Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                {getStepTitle()}
              </h2>
              <p className="text-white/60 text-sm">
                {getPlaceholder()}
              </p>
            </div>

            {/* Input Display */}
            <div className="relative mb-6">
              {showPinDots ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-6">
                  <PinDots
                    length={getCurrentValue().length}
                    maxLength={6}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  readOnly
                  value={getCurrentValue()}
                  placeholder={getPlaceholder()}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4
                           text-center text-xl text-white placeholder-white/40
                           focus:outline-none focus:border-white/20 transition-all"
                />
              )}

              {/* Back button */}
              {state.step !== 'id' && !state.isLoading && (
                <button
                  type="button"
                  onClick={actions.goBack}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50
                           hover:text-white transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Loading indicator */}
              {state.isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 size={20} className="animate-spin text-blue-400" />
                </div>
              )}
            </div>

            {/* Error Message */}
            {state.error && (
              <div className="mb-4 animate-fade-in">
                <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-4 rounded-xl">
                  {state.error}
                </p>
              </div>
            )}

            {/* Success Message for new PIN */}
            {state.step === 'new-pin' && (
              <div className="mb-4">
                <p className="text-blue-400 text-sm text-center bg-blue-400/10 py-2 px-4 rounded-xl">
                  Escolha um PIN seguro de 6 dígitos
                </p>
              </div>
            )}

            {/* Numeric Keypad */}
            <Numpad
              onDigit={actions.inputDigit}
              onDelete={actions.deleteDigit}
              disabled={state.isLoading}
              className="mb-6"
            />

            {/* Submit Button - Only for ID step (others auto-submit) */}
            {state.step === 'id' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={actions.submitStep}
                  disabled={state.userId.length === 0 || state.isLoading}
                  className={`w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                           text-white font-medium py-3 rounded-2xl text-base
                           transition-all flex items-center justify-center gap-2
                           ${state.userId.length === 0 || state.isLoading
                             ? 'opacity-50 cursor-not-allowed'
                             : 'hover:scale-[1.02] active:scale-[0.98]'
                           }`}
                >
                  {state.isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Seguinte
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/password-recovery')}
                  className="w-full text-white/60 hover:text-white/80 font-normal py-2
                           text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound size={16} />
                  Esqueceu o PIN?
                </button>
              </div>
            )}

            {/* Info Text */}
            {state.userData && state.step === 'pin' && (
              <div className="text-center mt-4">
                <p className="text-white/60 text-sm">
                  A entrar como: <span className="text-white font-medium">{state.userData.name}</span>
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3 z-50">
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center
                   text-red-400 hover:bg-red-500/30 transition-all"
          onClick={() => window.location.href = '/login-direto.html'}
          title="Login Direto (Emergência)"
        >
          <AlertTriangle size={20} />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center
                   text-white/60 hover:bg-white/20 transition-all"
          onClick={() => alert('Sistema v113\n• Login seguro com Supabase\n• ID + PIN 6 dígitos\n• Suporte: suporte@semrumo.eu')}
          title="Informações"
        >
          <Info size={20} />
        </button>
      </div>
    </div>
  );
};

export default LoginV2;