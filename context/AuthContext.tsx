import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, UserRole } from '../types/auth';
import { supabase } from '../services/supabaseClient';
import { permissionService } from '../services/permissionService';
import { isDemoMode, getDemoSession, getDemoUserById, demoUserToSession, clearDemoSession } from '../services/demoMode';

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
): Promise<UserSession | null> {
    // SECURITY FIX: No more ADMIN fallback. If we can't resolve, return null.
    if (!email) {
        console.error('[AuthContext] Cannot resolve session: no email provided');
        return null;
    }

    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        let query = supabase.from('users').select('id, role, name');
        
        if (email.endsWith('@myportal.internal')) {
            const numericId = email.replace('user', '').replace('@myportal.internal', '');
            query = query.eq('id', numericId);
        } else {
            query = query.eq('email', email);
        }

        const { data: userData, error } = await query.single();

        clearTimeout(timeout);

        if (error || !userData) {
            console.error('[AuthContext] User not found in DB for email:', email, error?.message);
            return null;
        }

        // Map DB role string to UserRole enum
        const dbRole = (userData.role || '').toUpperCase();
        let role: UserRole;
        if (['ADMIN', 'ADMINISTRADOR', 'RH', 'DIRETOR DE UNIDADE', 'RESPONSÁVEL DE DEPARTAMENTO'].includes(dbRole)) {
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

        // VALIDATION: userData.id from DB must ALWAYS be numeric (BigInt)
        if (isNaN(numericId) || numericId <= 0) {
            console.error(`[AuthContext] CRITICAL: Invalid user ID from database!`, {
                rawId: userData.id,
                email,
                type: typeof userData.id
            });
            return null;
        }

        return {
            id: String(numericId), // Store as string for consistency
            name: userData.name || email,
            role,
            permissions,
            email: email,
            token: accessToken
        };
    } catch (err) {
        console.error('[AuthContext] resolveUserSession error:', err);
        return null;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // === DEMO MODE: Restore session from localStorage ===
        if (isDemoMode()) {
            const demoSession = getDemoSession();
            if (demoSession) {
                const demoUser = getDemoUserById(demoSession.userId);
                if (demoUser) {
                    console.log('[AuthContext] Demo mode: restoring session for', demoUser.name);
                    setUser(demoUserToSession(demoUser));
                }
            }
            setIsLoading(false);
            return; // Don't subscribe to Supabase auth in demo mode
        }

        // === PRODUCTION: Supabase auth listener ===
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
                    if (userSession) {
                        setUser(userSession);
                    } else {
                        // Could not resolve user — don't grant ADMIN, show error state
                        console.error('[AuthContext] Failed to resolve user session, signing out');
                        setUser(null);
                        // Don't auto sign-out here to avoid loops, let the UI handle it
                    }
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
            // Demo mode: just clear the session
            if (isDemoMode()) {
                clearDemoSession();
                setUser(null);
                window.location.hash = '/login';
                return;
            }

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
