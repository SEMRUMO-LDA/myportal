import { supabase } from './supabaseClient';
import { UserRole } from '../types/auth';
import { clearIdCache } from './idResolver';
import { IdValidator, ensureNumericId } from '../utils/idValidator';
import { normalizeRoleName, isAdminRole } from '../utils/authUtils';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserData {
  id: number; // CORRIGIDO: Agora é number (BigInt do DB)
  authUuid?: string; // UUID do Supabase Auth (opcional, para referência)
  email: string;
  name: string;
  role: string;
  company?: string;
  department?: string;
  mustChangePassword?: boolean;
}

class AuthService {
  /**
   * Login com email e password
   */
  async login(credentials: LoginCredentials) {
    try {
      // 1. Autenticar com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password
      });

      if (authError) {
        console.error('Erro de autenticação:', authError);
        throw new Error('Email ou password incorretos');
      }

      if (!authData.user || !authData.session) {
        throw new Error('Falha na autenticação');
      }

      // 2. Buscar dados do utilizador (passando UUID do Auth para referência)
      const userData = await this.getUserData(
        authData.user.email || credentials.email,
        authData.user.id // UUID do Supabase Auth
      );

      return {
        success: true,
        user: userData,
        session: authData.session
      };

    } catch (error: any) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error.message || 'Erro ao fazer login'
      };
    }
  }

  /**
   * Buscar dados do utilizador na base de dados
   */
  async getUserData(email: string, authUuid?: string): Promise<UserData | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, company, department, must_change_password')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !data) {
        console.log('Utilizador não encontrado na tabela users');
        return null;
      }

      // IMPORTANTE: Validação CRÍTICA - Garantir que NUNCA seja UUID
      let numericId: number;
      try {
        // Isto vai EXPLODIR se for UUID, e é isso que queremos!
        numericId = IdValidator.validateUserId(data.id, 'authService.getUserData');
        console.log(`✅ [AuthService] ID validado com sucesso: ${numericId} para ${email}`);
      } catch (error: any) {
        console.error(`❌ [AuthService] ERRO CRÍTICO DE ID:`, error.message);
        console.error(`[AuthService] Dados recebidos do DB:`, data);

        // ALERTAR IMEDIATAMENTE - isto não deveria acontecer!
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          alert(`ERRO CRÍTICO: ID de usuário inválido!\n${error.message}\nVerifique o console.`);
        }

        return null;
      }

      return {
        ...data,
        id: numericId,
        authUuid: authUuid // Guardar UUID do Auth para referência se necessário
      } as UserData;
    } catch (error) {
      console.error('Erro ao buscar dados do utilizador:', error);
      return null;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Limpar cache de IDs
      clearIdCache();

      // Limpar cache se existir
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error);
      return {
        success: false,
        error: error.message || 'Erro ao fazer logout'
      };
    }
  }

  /**
   * Verificar se o utilizador está autenticado
   */
  async checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        isAuthenticated: !!session,
        session
      };
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return {
        isAuthenticated: false,
        session: null
      };
    }
  }

  /**
   * Obter sessão atual
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Determinar o role baseado na string do banco
   */
  parseUserRole(roleString: string): UserRole {
    const normalized = normalizeRoleName(roleString || '');

    if (isAdminRole(normalized)) {
      return UserRole.ADMIN;
    }

    if (normalized === 'auditor') {
      return UserRole.AUDITOR;
    }

    return UserRole.COLLABORATOR;
  }

  /**
   * Registar novo utilizador (apenas para admins)
   */
  async registerUser(email: string, password: string, userData: Partial<UserData>) {
    try {
      // 1. Criar conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password
      });

      if (authError) {
        throw new Error(`Erro ao criar conta: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Falha ao criar utilizador');
      }

      // 2. Criar entrada na tabela users
      const { data: newUser, error: dbError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name: userData.name || email.split('@')[0],
          role: userData.role || 'EMPLOYEE',
          company: userData.company || 'SEMRUMO',
          department: userData.department || 'Geral',
          status: 'ACTIVE',
          requires_new_pin: true
        })
        .select()
        .single();

      if (dbError) {
        // Se falhar, tentar apagar conta do Auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Erro ao criar dados do utilizador: ${dbError.message}`);
      }

      return {
        success: true,
        user: newUser
      };

    } catch (error: any) {
      console.error('Erro ao registar utilizador:', error);
      return {
        success: false,
        error: error.message || 'Erro ao registar utilizador'
      };
    }
  }

  /**
   * Recuperar password
   */
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Email de recuperação enviado'
      };

    } catch (error: any) {
      console.error('Erro ao recuperar password:', error);
      return {
        success: false,
        error: error.message || 'Erro ao enviar email de recuperação'
      };
    }
  }

  /**
   * Atualizar password (após reset)
   */
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Password atualizada com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao atualizar password:', error);
      return {
        success: false,
        error: error.message || 'Erro ao atualizar password'
      };
    }
  }
}

// Exportar instância única
export const authService = new AuthService();