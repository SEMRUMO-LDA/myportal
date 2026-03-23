/**
 * Integration Tests - Authentication Flow
 * Tests the complete authentication flow including login, session management, and logout
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '../../services/supabaseClient';
import { authService } from '../../services/authService';

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 123,
        email: 'test@example.com',
        name: 'Test User',
        role: 'EMPLOYEE'
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'auth-uuid', email: 'test@example.com' },
          session: { access_token: 'token123' }
        },
        error: null
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      } as any);

      const result = await authService.login({
        email: 'test@example.com',
        password: '123456'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(123);
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should fail login with invalid credentials', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', name: 'AuthError', status: 401 }
      } as any);

      const result = await authService.login({
        email: 'wrong@example.com',
        password: 'wrongpass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate numeric user ID from database', async () => {
      const mockUserWithUUID = {
        id: 'not-a-number', // Invalid - should be numeric
        email: 'test@example.com',
        name: 'Test User',
        role: 'EMPLOYEE'
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'auth-uuid', email: 'test@example.com' },
          session: { access_token: 'token123' }
        },
        error: null
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserWithUUID,
              error: null
            })
          })
        })
      } as any);

      const result = await authService.login({
        email: 'test@example.com',
        password: '123456'
      });

      // Should handle gracefully by returning null user data
      expect(result.success).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should maintain session after page refresh', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: 'auth-uuid', email: 'test@example.com' },
            access_token: 'token123'
          }
        },
        error: null
      } as any);

      const { isAuthenticated } = await authService.checkAuth();
      expect(isAuthenticated).toBe(true);
    });

    it('should detect missing session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      } as any);

      const { isAuthenticated } = await authService.checkAuth();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Logout Flow', () => {
    it('should successfully logout user', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null
      });

      const result = await authService.logout();
      expect(result.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
