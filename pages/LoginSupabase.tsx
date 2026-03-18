import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn, AlertCircle, Mail, Lock, Building2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const LoginSupabase: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login com Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou password incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Por favor confirme o seu email primeiro');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data?.user) {
        setSuccess('Login efetuado com sucesso!');

        // Buscar role do utilizador
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('email', email.toLowerCase())
          .single();

        // Redirecionar baseado no role
        setTimeout(() => {
          if (userData?.role === 'ADMIN' || userData?.role === 'Administrador') {
            navigate('/admin');
          } else {
            navigate('/portal');
          }
        }, 500);
      }

    } catch (err: any) {
      console.error('Erro no login:', err);
      setError('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  // Recuperar password
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor introduza o seu email primeiro');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Email de recuperação enviado! Verifique a sua caixa de entrada.');
      }
    } catch (err) {
      setError('Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-full mb-4 border border-white/20">
            <Building2 className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">SEMRUMO</h1>
          <p className="text-blue-200">Portal de Colaboradores</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="seu.email@empresa.pt"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Mensagens */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Botões */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Entrar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm py-2 transition-colors"
              >
                Esqueceu a password?
              </button>
            </div>
          </form>

          {/* Info de Desenvolvimento */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">Ambiente de Desenvolvimento</p>
                <div className="space-y-1 text-xs text-blue-700">
                  <div className="font-mono">admin@semrumo.eu</div>
                  <div className="font-mono">user@semrumo.eu</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-200 text-sm">
          © 2024 SEMRUMO - Todos os direitos reservados
        </div>
      </div>
    </div>
  );
};

export default LoginSupabase;