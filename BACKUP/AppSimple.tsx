import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContextSimple';
import LoginSupabase from './pages/LoginSupabase';
import { supabase } from './services/supabaseClient';

// Importar páginas existentes que você quer manter
import Dashboard from './pages/Dashboard';
import UserProfile from './pages/UserProfile';
import MyProfile from './pages/MyProfile';

// Componente de rota protegida
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout simples para páginas autenticadas
const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header simples */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">SEMRUMO Portal</h1>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

// Portal Page - Dashboard simplificado
const PortalPage: React.FC = () => {
  const [user, setUser] = React.useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();
        setUser(data);
      }
    };
    loadUser();
  }, []);

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Cabeçalho de boas-vindas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bem-vindo, {user?.name || 'Colaborador'}!
          </h2>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('pt-PT', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Cards de informação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Perfil</h3>
            <p className="text-gray-600 text-sm mb-4">Veja e edite suas informações pessoais</p>
            <a href="/profile" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Acessar →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Presenças</h3>
            <p className="text-gray-600 text-sm mb-4">Consulte seu histórico de presenças</p>
            <a href="/attendance" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Ver mais →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Férias</h3>
            <p className="text-gray-600 text-sm mb-4">Solicite e gerencie suas férias</p>
            <a href="/vacations" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Solicitar →
            </a>
          </div>
        </div>

        {/* Informações do utilizador */}
        {user && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Suas Informações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Departamento</p>
                <p className="font-medium">{user.department || 'Não definido'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Empresa</p>
                <p className="font-medium">{user.company || 'SEMRUMO'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium">{user.role || 'Colaborador'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

// Admin Page
const AdminPage: React.FC = () => {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Painel Administrativo</h2>
          <p className="text-gray-600 mb-6">Gerencie utilizadores, presenças e configurações do sistema.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="/users" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <h3 className="font-semibold text-blue-900">Utilizadores</h3>
              <p className="text-sm text-blue-700 mt-1">Gerir colaboradores</p>
            </a>

            <a href="/attendance" className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <h3 className="font-semibold text-green-900">Presenças</h3>
              <p className="text-sm text-green-700 mt-1">Controlo de ponto</p>
            </a>

            <a href="/settings" className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <h3 className="font-semibold text-purple-900">Configurações</h3>
              <p className="text-sm text-purple-700 mt-1">Definições do sistema</p>
            </a>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

// Componente principal da aplicação
const AppSimple: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota de Login */}
          <Route path="/login" element={<LoginSupabase />} />

          {/* Rotas Protegidas */}
          <Route path="/portal" element={
            <ProtectedRoute>
              <PortalPage />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />

          {/* Redirecionar root para login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Fallback para rotas não encontradas */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppSimple;