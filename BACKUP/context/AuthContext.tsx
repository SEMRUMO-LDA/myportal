import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, UserRole } from '../types/auth';
import { supabase } from '../services/supabaseClient';
import { permissionService } from '../services/permissionService';

interface AuthContextType {
    user: UserSession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (session: UserSession) => void;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper: resolve role and permissions from DB user record
async function resolveUserSession(
    authId: string,
    email: string | undefined,
    accessToken: string
): Promise<UserSession> {
    // Fallback session (ADMIN) if DB lookup fails
    const fallback: UserSession = {
        id: authId,
        name: email || 'Admin',
        role: UserRole.ADMIN,
        permissions: ['*'],
        email: email || '',
        token: accessToken
    };

    if (!email) return fallback;

    try {
        const { data: userData, error } = await supabase
            .from('users')
            .select('id, role, name')
            .eq('email', email)
            .single();

        if (error || !userData) return fallback;

        // Map DB role string to UserRole enum
        const dbRole = (userData.role || '').toUpperCase();
        let role: UserRole;
        if (dbRole === 'ADMIN' || dbRole === 'ADMINISTRADOR') {
            role = UserRole.ADMIN;
        } else if (dbRole === 'AUDITOR') {
            role = UserRole.AUDITOR;
        } else {
            role = UserRole.COLLABORATOR;
        }

        // Admin gets all permissions, others get from DB
        let permissions: string[] = ['*'];
        if (role !== UserRole.ADMIN) {
            try {
                const perms = await permissionService.getUserPermissions(userData.role);
                if (perms.length > 0) permissions = perms;
            } catch {
                permissions = [];
            }
        }

        // CRITICAL: Ensure we have a numeric ID (BigInt) for the database
        const numericId = Number(userData.id);
        const finalId = !isNaN(numericId) ? String(numericId) : authId;
        
        if (finalId === authId && !email.includes('@semrumo.pt')) {
           console.warn(`[AuthContext] Session ID resolved to UUID instead of BigInt for ${email}. DB operations may fail.`);
        }

        return {
            id: finalId,
            name: userData.name || email,
            role,
            permissions,
            email: email,
            token: accessToken
        };
    } catch (err) {
        console.error('[AuthContext] resolveUserSession error:', err);
        return fallback;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Single listener handles ALL auth events including INITIAL_SESSION.
        // This eliminates the race condition between getSession() and onAuthStateChange.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            if (import.meta.env.DEV) console.log("AuthContext: Auth Change Event:", event);

            if (session?.user) {
                const userSession = await resolveUserSession(
                    session.user.id,
                    session.user.email,
                    session.access_token
                );
                if (isMounted) {
                    setUser(userSession);
                    setIsLoading(false);
                }
            } else {
                if (isMounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = (session: UserSession) => {
        setUser(session);
    };

    const logout = async () => {
        try {
            // 1. Tentar fazer signOut no Supabase
            await supabase.auth.signOut().catch(e => console.warn('SignOut falhou:', e));

            // 2. Limpar user state
            setUser(null);

            // 3. Limpar localStorage e sessionStorage
            localStorage.clear();
            sessionStorage.clear();

            // 4. Limpar IndexedDB (cache offline)
            if ('indexedDB' in window) {
                try {
                    await indexedDB.deleteDatabase('MYPORTAL_OFFLINE_DB');
                } catch (e) {
                    console.warn('Erro ao limpar IndexedDB:', e);
                }
            }

            // 5. Limpar Service Worker caches
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                } catch (e) {
                    console.warn('Erro ao limpar caches:', e);
                }
            }

            // 6. Desregistar Service Worker
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                    }
                } catch (e) {
                    console.warn('Erro ao desregistar SW:', e);
                }
            }

            // 7. Forçar redirecionamento para login
            window.location.hash = '/login';

        } catch (error) {
            console.error('Erro no logout:', error);

            // FORÇA LOGOUT MESMO COM ERRO
            localStorage.clear();
            sessionStorage.clear();
            window.location.hash = '/login';
        }
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === UserRole.ADMIN || user.permissions.includes('*')) return true;
        return user.permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
    return context;
};
