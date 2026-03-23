/**
 * Logout Service - Hard Logout with Complete Cache Cleanup
 *
 * Provides a robust logout mechanism that:
 * 1. Signs out from Supabase Auth
 * 2. Clears all localStorage (tokens, cache, preferences)
 * 3. Clears sessionStorage
 * 4. Invalidates query cache
 * 5. Optionally forces page reload for complete cleanup
 *
 * USE CASES:
 * - Regular logout (preserves preferences)
 * - Kiosk logout (full cleanup for security)
 * - Security logout (suspicious activity detected)
 */

import { supabase, invalidateCache } from './supabaseClient';

export interface LogoutOptions {
  /**
   * Clear ALL localStorage including user preferences
   * Use for kiosks/shared devices
   * @default false
   */
  clearPreferences?: boolean;

  /**
   * Force page reload after logout
   * Ensures complete memory cleanup
   * @default true
   */
  forceReload?: boolean;

  /**
   * Clear Service Worker cache (PWA cache)
   * Heavy operation, use only if necessary
   * @default false
   */
  clearServiceWorkerCache?: boolean;

  /**
   * Reason for logout (for logging/analytics)
   * @default 'user_action'
   */
  reason?: 'user_action' | 'inactivity' | 'security' | 'session_expired' | 'kiosk_timeout';
}

/**
 * List of localStorage keys to preserve during logout
 * (only applies when clearPreferences: false)
 */
const PRESERVED_KEYS = [
  'theme',              // User theme preference (dark/light)
  'language',           // User language preference
  'notifications_enabled', // Push notification preference
  'last_username',      // Remember last username (optional)
];

class LogoutService {
  /**
   * Perform complete logout with cache cleanup
   */
  async logout(options: LogoutOptions = {}): Promise<void> {
    const {
      clearPreferences = false,
      forceReload = true,
      clearServiceWorkerCache = false,
      reason = 'user_action'
    } = options;

    console.log('[LogoutService] Starting logout process...', {
      clearPreferences,
      forceReload,
      clearServiceWorkerCache,
      reason
    });

    try {
      // STEP 1: Sign out from Supabase Auth
      console.log('[LogoutService] Step 1: Signing out from Supabase Auth...');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[LogoutService] Supabase signOut error:', error);
        // Continue cleanup even if signOut fails
      } else {
        console.log('[LogoutService] ✅ Supabase signOut successful');
      }

      // STEP 2: Invalidate query cache
      console.log('[LogoutService] Step 2: Invalidating query cache...');
      invalidateCache(); // Clear all cached queries
      console.log('[LogoutService] ✅ Query cache invalidated');

      // STEP 3: Clear localStorage
      console.log('[LogoutService] Step 3: Clearing localStorage...');
      await this.clearLocalStorage(clearPreferences);
      console.log('[LogoutService] ✅ localStorage cleared');

      // STEP 4: Clear sessionStorage
      console.log('[LogoutService] Step 4: Clearing sessionStorage...');
      this.clearSessionStorage();
      console.log('[LogoutService] ✅ sessionStorage cleared');

      // STEP 5: Clear Service Worker cache (optional)
      if (clearServiceWorkerCache) {
        console.log('[LogoutService] Step 5: Clearing Service Worker cache...');
        await this.clearServiceWorkerCaches();
        console.log('[LogoutService] ✅ Service Worker cache cleared');
      }

      // STEP 6: Force reload (optional)
      if (forceReload) {
        console.log('[LogoutService] Step 6: Force reloading page...');
        // Small delay to ensure cleanup completes
        setTimeout(() => {
          window.location.href = window.location.origin + window.location.pathname;
        }, 100);
      }

      console.log('[LogoutService] ✅ Logout complete', { reason });
    } catch (error) {
      console.error('[LogoutService] ❌ Error during logout:', error);
      // Even if error, try to force reload to clear state
      if (forceReload) {
        setTimeout(() => {
          window.location.href = window.location.origin + window.location.pathname;
        }, 100);
      }
      throw error;
    }
  }

  /**
   * Clear localStorage with optional preference preservation
   */
  private async clearLocalStorage(clearAll: boolean): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    if (clearAll) {
      // FULL CLEANUP - Remove everything
      console.log('[LogoutService] Clearing ALL localStorage (including preferences)');
      window.localStorage.clear();
      return;
    }

    // SELECTIVE CLEANUP - Preserve user preferences
    console.log('[LogoutService] Clearing localStorage (preserving preferences)');

    // Save preserved values
    const preserved: Record<string, string | null> = {};
    PRESERVED_KEYS.forEach(key => {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        preserved[key] = value;
      }
    });

    // Clear everything
    window.localStorage.clear();

    // Restore preserved values
    Object.entries(preserved).forEach(([key, value]) => {
      if (value !== null) {
        window.localStorage.setItem(key, value);
      }
    });

    console.log('[LogoutService] Preserved keys:', Object.keys(preserved));
  }

  /**
   * Clear sessionStorage completely
   */
  private clearSessionStorage(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    window.sessionStorage.clear();
  }

  /**
   * Clear Service Worker caches (PWA cache)
   * Heavy operation - use sparingly
   */
  private async clearServiceWorkerCaches(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      console.log('[LogoutService] Found caches:', cacheNames);

      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[LogoutService] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );

      console.log('[LogoutService] All Service Worker caches deleted');
    } catch (error) {
      console.error('[LogoutService] Error clearing Service Worker caches:', error);
    }
  }

  /**
   * Quick logout for kiosks/shared devices
   * Clears EVERYTHING and forces reload
   */
  async kioskLogout(): Promise<void> {
    console.log('[LogoutService] KIOSK LOGOUT - Full cleanup mode');
    return this.logout({
      clearPreferences: true,      // Clear ALL data
      forceReload: true,            // Force page reload
      clearServiceWorkerCache: false, // Usually not needed
      reason: 'kiosk_timeout'
    });
  }

  /**
   * Regular logout for normal users
   * Preserves preferences like theme, language
   */
  async userLogout(): Promise<void> {
    console.log('[LogoutService] USER LOGOUT - Preserving preferences');
    return this.logout({
      clearPreferences: false,     // Keep user preferences
      forceReload: true,            // Force page reload
      clearServiceWorkerCache: false,
      reason: 'user_action'
    });
  }

  /**
   * Security logout (suspicious activity)
   * Clears everything but doesn't reload immediately
   */
  async securityLogout(): Promise<void> {
    console.log('[LogoutService] SECURITY LOGOUT - Maximum cleanup');
    return this.logout({
      clearPreferences: true,       // Clear ALL data
      forceReload: true,             // Force reload
      clearServiceWorkerCache: true, // Clear even SW cache
      reason: 'security'
    });
  }

  /**
   * Check if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  }

  /**
   * Get current session info
   */
  async getSessionInfo(): Promise<{
    isLoggedIn: boolean;
    userId?: string;
    email?: string;
    expiresAt?: number;
    timeRemaining?: number;
  }> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { isLoggedIn: false };
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const timeRemaining = expiresAt - Date.now();

    return {
      isLoggedIn: true,
      userId: session.user.id,
      email: session.user.email,
      expiresAt,
      timeRemaining: Math.max(0, timeRemaining)
    };
  }
}

// Export singleton instance
export const logoutService = new LogoutService();

// Export convenience functions
export const logout = (options?: LogoutOptions) => logoutService.logout(options);
export const kioskLogout = () => logoutService.kioskLogout();
export const userLogout = () => logoutService.userLogout();
export const securityLogout = () => logoutService.securityLogout();
