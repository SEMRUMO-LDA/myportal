/**
 * LoginOptimized.tsx
 * Versão otimizada do login com carregamento ultra-rápido
 * Target: < 1 segundo para interatividade
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

// Componente de loading mínimo (inline CSS para evitar espera por CSS externo)
const QuickLoader = memo(() => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      width: '80px',
      height: '80px',
      background: 'white',
      borderRadius: '20px',
      animation: 'quickPulse 1.5s ease-in-out infinite'
    }}>
      <style>{`
        @keyframes quickPulse {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  </div>
));

// Componente principal otimizado
const LoginOptimized: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'check' | 'ready' | 'loading'>('check');
  const [credentials, setCredentials] = useState({ identifier: '', pin: '' });
  const [error, setError] = useState('');

  // Verificação rápida de sessão existente
  useEffect(() => {
    const quickCheck = async () => {
      try {
        // Verificar localStorage primeiro (síncrono e rápido)
        const cachedSession = localStorage.getItem('supabase.auth.token');

        if (cachedSession) {
          // Validar com Supabase em background
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            navigate('/dashboard');
            return;
          }
        }

        setPhase('ready');
      } catch {
        setPhase('ready');
      }
    };

    quickCheck();
  }, [navigate]);

  // Handler otimizado para login
  const handleQuickLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.identifier || !credentials.pin) {
      setError('Preencha todos os campos');
      return;
    }

    setPhase('loading');
    setError('');

    try {
      // Determinar se é email ou ID
      const isEmail = credentials.identifier.includes('@');

      // Query otimizada - buscar apenas o necessário
      let query = supabase
        .from('users')
        .select('id, email, name, role, auth_id, requires_new_pin')
        .eq('pin', credentials.pin)
        .eq('status', 'ACTIVE')
        .single();

      if (isEmail) {
        query = query.eq('email', credentials.identifier.toLowerCase());
      } else {
        query = query.eq('id', parseInt(credentials.identifier));
      }

      const { data: userData, error: userError } = await query;

      if (userError || !userData) {
        setError('Credenciais inválidas');
        setPhase('ready');
        return;
      }

      // Login no Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: credentials.pin
      });

      if (authError) {
        // Fallback: criar sessão customizada se auth falhar
        localStorage.setItem('user_session', JSON.stringify({
          id: userData.id,
          name: userData.name,
          role: userData.role,
          timestamp: Date.now()
        }));
      }

      // Guardar dados mínimos para acesso rápido
      localStorage.setItem('user_data', JSON.stringify({
        id: userData.id,
        name: userData.name,
        role: userData.role
      }));

      // Navegação imediata
      if (userData.requires_new_pin) {
        navigate('/change-pin');
      } else {
        navigate('/dashboard');
      }

      // Carregar resto dos dados em background após navegação
      requestIdleCallback(() => {
        preloadDashboardData(userData.id);
      });

    } catch (err) {
      setError('Erro ao fazer login');
      setPhase('ready');
    }
  }, [credentials, navigate]);

  // Preload de dados do dashboard em background
  const preloadDashboardData = async (userId: number) => {
    try {
      // Carregar dados que serão necessários no dashboard
      const promises = [
        supabase.from('time_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        supabase.from('leaves').select('*').eq('user_id', userId).eq('status', 'APPROVED'),
        // Adicionar mais queries conforme necessário
      ];

      await Promise.all(promises);
    } catch {
      // Silently fail - não é crítico
    }
  };

  // Input handler otimizado
  const handleInput = useCallback((field: 'identifier' | 'pin', value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    setError(''); // Limpar erro ao digitar
  }, []);

  // Renderização condicional baseada na fase
  if (phase === 'check') {
    return <QuickLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏰</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SEMRUMO</h1>
          <p className="text-white/80">MyPortal - Sistema de Gestão</p>
        </div>

        {/* Formulário */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleQuickLogin} className="space-y-6">
            {/* Campo Email/ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ou ID
              </label>
              <input
                type="text"
                value={credentials.identifier}
                onChange={(e) => handleInput('identifier', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="exemplo@email.com ou 123"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            {/* Campo PIN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                type="password"
                value={credentials.pin}
                onChange={(e) => handleInput('pin', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••"
                maxLength={6}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={phase === 'loading'}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === 'loading' ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  A entrar...
                </span>
              ) : (
                'Entrar'
              )}
            </button>

            {/* Link Recuperação */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/recover')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Esqueceu o PIN?
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white/60 text-sm">
          © 2024 SEMRUMO - v114
        </div>
      </div>
    </div>
  );
};

export default memo(LoginOptimized);