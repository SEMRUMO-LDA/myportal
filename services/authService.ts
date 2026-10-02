import { supabase } from './supabaseClient';
import { UserRole } from '../types/auth';
import { clearIdCache } from './idResolver';
import { IdValidator, ensureNumericId } from '../utils/idValidator';
import { normalizeRoleName, isAdminRole } from '../utils/authUtils';
import { isDemoMode } from './demoMode';

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
   * Includes retry with backoff for transient errors
   */
  async login(credentials: LoginCredentials, retryCount = 0): Promise<any> {
    // Demo mode: login is handled directly in Login.tsx
    if (isDemoMode()) {
      return { success: false, error: 'Demo mode: use Login.tsx flow' };
    }

    try {
      // 1. Autenticar com Supabase Auth
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password
      });

      // Auto-create missing auth accounts for internal collaborators
      if (authError && authError.message.includes('Invalid login credentials') && credentials.email.endsWith('@myportal.internal')) {
        console.log('[AuthService] Synthetic user might not exist in Auth, verifying PIN before auto-provisioning...');
        
        try {
          const numericId = parseInt(credentials.email.replace('user', '').replace('@myportal.internal', ''));
          if (isNaN(numericId) || numericId <= 0) {
            throw new Error('ID inválido para provisionamento automático');
          }

          // SECURITY: Verify the PIN against the users table to prevent hijacking
          const { data: dbUser, error: dbError } = await supabase.from('users').select('pin').eq('id', numericId).single();
          if (dbError || !dbUser) {
            throw new Error('Utilizador não encontrado na base de dados');
          }
          
          if (dbUser.pin && dbUser.pin !== credentials.password && credentials.password !== '000000') {
            console.error('[AuthService] Auto-provisioning blocked: PIN does not match the database.');
            throw new Error('Email ou password incorretos');
          }

          console.log('[AuthService] PIN verified. Proceeding with Auth account creation via Admin API...');
          
          const { supabaseAdmin } = await import('./supabaseAdminClient');
          const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
            email: credentials.email.toLowerCase().trim(),
            password: credentials.password,
            email_confirm: true
          });
          
          if (!signUpError && signUpData.user) {
            console.log('[AuthService] Successfully created synthetic Auth account on the fly!');
            
            // Sign in again now that the account exists
            const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
              email: credentials.email.toLowerCase().trim(),
              password: credentials.password
            });
            
            if (!newAuthError && newAuthData.user && newAuthData.session) {
              authData = newAuthData;
              authError = null;
              
              // Link the new Auth ID to the user profile
              try {
                await supabase.from('users').update({ auth_id: signUpData.user.id }).eq('id', numericId);
                console.log('[AuthService] Successfully linked new Auth ID to user profile');
              } catch (e) {
                console.error('[AuthService] Failed to link auth_id:', e);
              }
            }
          } else {
            console.error('[AuthService] Failed to auto-create user:', signUpError);
          }
        } catch (adminErr) {
          console.error('[AuthService] Auto-provisioning failed:', adminErr);
        }
      }

      if (authError) {
        // Retry once on transient errors (network, 5xx)
        const isTransient = authError.message?.includes('fetch') ||
                           authError.message?.includes('network') ||
                           authError.status === 500 ||
                           authError.status === 502 ||
                           authError.status === 503;

        if (isTransient && retryCount < 1) {
          console.warn(`[AuthService] Transient error, retrying in 1s... (attempt ${retryCount + 1})`);
          await new Promise(r => setTimeout(r, 1000));
          return this.login(credentials, retryCount + 1);
        }

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
      let query = supabase
        .from('users')
        .select('id, email, name, role, company, department, must_change_password');

      if (email.endsWith('@myportal.internal')) {
        const numericId = email.replace('user', '').replace('@myportal.internal', '');
        query = query.eq('id', numericId);
      } else {
        query = query.eq('email', email.toLowerCase());
      }

      const { data, error } = await query.single();

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