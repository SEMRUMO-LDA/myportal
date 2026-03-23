/**
 * useLoginFlow Hook
 * Manages the complete login flow logic separated from UI
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

export type LoginStep = 'id' | 'pin' | 'new-pin' | 'confirm-pin';
export type LoginMode = 'colaborador' | 'administrador';

interface LoginState {
  step: LoginStep;
  mode: LoginMode;
  userId: string;
  pin: string;
  newPin: string;
  confirmPin: string;
  error: string;
  isLoading: boolean;
  userData: any | null;
}

interface UseLoginFlowReturn {
  state: LoginState;
  actions: {
    setMode: (mode: LoginMode) => void;
    inputDigit: (digit: string) => void;
    deleteDigit: () => void;
    submitStep: () => Promise<void>;
    goBack: () => void;
    reset: () => void;
  };
}

export function useLoginFlow(): UseLoginFlowReturn {
  const navigate = useNavigate();
  const { login } = useAuth();
  const isSubmittingRef = useRef(false);

  const [state, setState] = useState<LoginState>({
    step: 'id',
    mode: 'colaborador',
    userId: '',
    pin: '',
    newPin: '',
    confirmPin: '',
    error: '',
    isLoading: false,
    userData: null
  });

  // Set login mode (colaborador/administrador)
  const setMode = useCallback((mode: LoginMode) => {
    setState(prev => ({ ...prev, mode, error: '' }));
  }, []);

  // Add digit to current input
  const inputDigit = useCallback((digit: string) => {
    setState(prev => {
      const newState = { ...prev, error: '' };

      switch (prev.step) {
        case 'id':
          if (prev.userId.length < 8) {
            newState.userId = prev.userId + digit;
          }
          break;
        case 'pin':
          if (prev.pin.length < 6) {
            newState.pin = prev.pin + digit;
          }
          break;
        case 'new-pin':
          if (prev.newPin.length < 6) {
            newState.newPin = prev.newPin + digit;
          }
          break;
        case 'confirm-pin':
          if (prev.confirmPin.length < 6) {
            newState.confirmPin = prev.confirmPin + digit;
          }
          break;
      }

      return newState;
    });
  }, []);

  // Delete last digit
  const deleteDigit = useCallback(() => {
    setState(prev => {
      const newState = { ...prev };

      switch (prev.step) {
        case 'id':
          newState.userId = prev.userId.slice(0, -1);
          break;
        case 'pin':
          newState.pin = prev.pin.slice(0, -1);
          break;
        case 'new-pin':
          newState.newPin = prev.newPin.slice(0, -1);
          break;
        case 'confirm-pin':
          newState.confirmPin = prev.confirmPin.slice(0, -1);
          break;
      }

      return newState;
    });
  }, []);

  // Submit current step
  const submitStep = useCallback(async () => {
    // Prevent double submission
    if (isSubmittingRef.current) {
      console.log('[LoginFlow] Already submitting, ignoring');
      return;
    }

    isSubmittingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      const { step, userId, pin, newPin, confirmPin, mode } = state;

      switch (step) {
        case 'id': {
          // Validate ID
          const id = parseInt(userId);
          if (isNaN(id) || id <= 0) {
            throw new Error('ID inválido. Use apenas números.');
          }

          // Fetch user from database
          console.log('[LoginFlow] Fetching user:', id);
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

          if (error || !data) {
            throw new Error('Utilizador não encontrado.');
          }

          console.log('[LoginFlow] User found:', data.name);

          // Store user data and move to PIN step
          setState(prev => ({
            ...prev,
            userData: data,
            step: 'pin',
            pin: '',
            isLoading: false,
            error: ''
          }));
          break;
        }

        case 'pin': {
          if (pin.length < 6) {
            throw new Error('PIN deve ter 6 dígitos');
          }

          if (!state.userData) {
            throw new Error('Dados do utilizador não encontrados');
          }

          // Try login with Supabase Auth
          const email = state.userData.email || `user${state.userData.id}@myportal.internal`;

          console.log('[LoginFlow] Attempting login for:', email);
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password: pin
          });

          if (authError) {
            throw new Error('PIN incorreto');
          }

          console.log('[LoginFlow] Login successful!');

          // Check if needs new PIN
          const isDefaultPin = pin === '123456' || pin === '111111' || pin === '000000';
          if (state.userData.requires_new_pin || isDefaultPin) {
            setState(prev => ({
              ...prev,
              step: 'new-pin',
              newPin: '',
              isLoading: false
            }));
          } else {
            // Login successful - determine redirect
            const isAdmin =
              mode === 'administrador' && (
                state.userData.role === 'Responsável de Departamento' ||
                state.userData.role === 'Diretor de Unidade' ||
                state.userData.role === 'RH' ||
                state.userData.role === 'Administrador' ||
                state.userData.role === 'ADMIN'
              );

            const redirectTo = isAdmin ? '/admin' : '/portal';
            console.log('[LoginFlow] Redirecting to:', redirectTo);

            // Navigate
            navigate(redirectTo, { replace: true });
          }
          break;
        }

        case 'new-pin': {
          if (newPin.length !== 6) {
            throw new Error('PIN deve ter exatamente 6 dígitos');
          }

          // Check if new PIN is not a common/weak one
          const weakPins = ['123456', '111111', '000000', '123123', '654321'];
          if (weakPins.includes(newPin)) {
            throw new Error('PIN muito simples. Escolha outro.');
          }

          setState(prev => ({
            ...prev,
            step: 'confirm-pin',
            confirmPin: '',
            isLoading: false
          }));
          break;
        }

        case 'confirm-pin': {
          if (confirmPin !== state.newPin) {
            throw new Error('PINs não coincidem');
          }

          // Update PIN in Supabase Auth
          const { error: updateError } = await supabase.auth.updateUser({
            password: confirmPin
          });

          if (updateError) {
            throw new Error('Erro ao atualizar PIN');
          }

          // Update database flag
          await supabase
            .from('users')
            .update({ requires_new_pin: false })
            .eq('id', state.userData.id);

          console.log('[LoginFlow] PIN updated successfully');

          // Redirect based on mode
          const isAdmin =
            state.mode === 'administrador' && (
              state.userData.role === 'Responsável de Departamento' ||
              state.userData.role === 'Diretor de Unidade' ||
              state.userData.role === 'RH' ||
              state.userData.role === 'Administrador'
            );

          const redirectTo = isAdmin ? '/admin' : '/portal';
          navigate(redirectTo, { replace: true });
          break;
        }
      }
    } catch (error: any) {
      console.error('[LoginFlow] Error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro desconhecido'
      }));
    } finally {
      isSubmittingRef.current = false;
    }
  }, [state, navigate]);

  // Go back to previous step
  const goBack = useCallback(() => {
    setState(prev => {
      switch (prev.step) {
        case 'confirm-pin':
          return { ...prev, step: 'new-pin', confirmPin: '' };
        case 'new-pin':
          return { ...prev, step: 'pin', newPin: '', confirmPin: '' };
        case 'pin':
          return { ...prev, step: 'id', pin: '', userData: null };
        default:
          return prev;
      }
    });
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    setState({
      step: 'id',
      mode: 'colaborador',
      userId: '',
      pin: '',
      newPin: '',
      confirmPin: '',
      error: '',
      isLoading: false,
      userData: null
    });
  }, []);

  return {
    state,
    actions: {
      setMode,
      inputDigit,
      deleteDigit,
      submitStep,
      goBack,
      reset
    }
  };
}