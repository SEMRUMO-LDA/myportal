import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';

const LoginSimple: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (user) {
      if (user.role === UserRole.ADMIN) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/portal', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login simples com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        setError('Email ou password incorretos');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Erro ao fazer login');
        setLoading(false);
        return;
      }

      // Buscar dados do utilizador na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, role, email, company, department')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !userData) {
        // Se não encontrar, criar sessão básica
        const session = {
          id: authData.user.id,
          name: authData.user.email || 'Utilizador',
          role: UserRole.COLLABORATOR,
          token: authData.session?.access_token || '',
          permissions: []
        };
        login(session);
      } else {
        // Determinar role
        let role = UserRole.COLLABORATOR;
        if (userData.role === 'ADMIN' || userData.role === 'Administrador') {
          role = UserRole.ADMIN;
        } else if (userData.role === 'AUDITOR') {
          role = UserRole.AUDITOR;
        }

        // Criar sessão com dados do utilizador
        const session = {
          id: userData.id.toString(),
          name: userData.name || userData.email,
          role,
          token: authData.session?.access_token || '',
          permissions: role === UserRole.ADMIN ? ['*'] : []
        };

        login(session);
      }

      // Navegação será feita pelo useEffect quando o user mudar

    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SEMRUMO Portal</h1>
          <p className="text-gray-500 mt-2">Entre com suas credenciais</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Botão de login */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                A entrar...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Entrar
              </>
            )}
          </button>
        </form>

        {/* Credenciais de teste (desenvolvimento) */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-2">Credenciais de teste:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <div>Admin: admin@semrumo.eu / 1234</div>
              <div>User: user@semrumo.eu / 1234</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginSimple;