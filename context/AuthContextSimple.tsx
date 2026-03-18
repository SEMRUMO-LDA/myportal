import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, UserRole } from '../types/auth';
import { supabase } from '../services/supabaseClient';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (session: UserSession) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar sessão ao carregar
  useEffect(() => {
    checkSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (session?.user) {
        // Buscar dados do utilizador
        const userData = await authService.getUserData(session.user.email || '');

        if (userData) {
          const userSession: UserSession = {
            id: userData.id,
            name: userData.name || userData.email,
            role: authService.parseUserRole(userData.role),
            token: session.access_token,
            permissions: userData.role === 'ADMIN' ? ['*'] : []
          };
          setUser(userSession);
        } else {
          // Utilizador básico se não encontrar na BD
          const userSession: UserSession = {
            id: session.user.id,
            name: session.user.email || 'Utilizador',
            role: UserRole.COLLABORATOR,
            token: session.access_token,
            permissions: []
          };
          setUser(userSession);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Verificar sessão existente
  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const userData = await authService.getUserData(session.user.email || '');

        if (userData) {
          const userSession: UserSession = {
            id: userData.id,
            name: userData.name || userData.email,
            role: authService.parseUserRole(userData.role),
            token: session.access_token,
            permissions: userData.role === 'ADMIN' ? ['*'] : []
          };
          setUser(userSession);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login manual (para compatibilidade)
  const login = (session: UserSession) => {
    setUser(session);
  };

  // Logout
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  // Verificar permissão
  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};