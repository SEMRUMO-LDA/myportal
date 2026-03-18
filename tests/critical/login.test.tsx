/**
 * Critical Test: Login Flow
 * Priority: P0 - Business Critical
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import { supabase } from '../../services/supabaseClient';

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Login', () => {
    it('should successfully login admin with valid credentials', async () => {
      const mockUser = { id: '123', email: 'admin@test.com' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: mockUser, session: {} },
        error: null
      } as any);

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      // Switch to admin tab
      const adminTab = screen.getByText('Administração');
      fireEvent.click(adminTab);

      // Fill form
      const emailInput = screen.getByPlaceholderText('seu@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Submit
      const loginButton = screen.getByRole('button', { name: /Entrar/i });
      fireEvent.click(loginButton);

      // Verify navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error on invalid admin credentials', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      } as any);

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      const adminTab = screen.getByText('Administração');
      fireEvent.click(adminTab);

      const emailInput = screen.getByPlaceholderText('seu@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

      const loginButton = screen.getByRole('button', { name: /Entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Credenciais inválidas/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Kiosk Login', () => {
    it('should successfully login kiosk with valid code and PIN', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        pin: '1234'
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockUser, error: null }))
          }))
        }))
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      // Default should be Kiosk tab
      const idInput = screen.getByPlaceholderText(/ID/i);
      const pinInput = screen.getByPlaceholderText('PIN');

      fireEvent.change(idInput, { target: { value: '1' } });
      fireEvent.change(pinInput, { target: { value: '1234' } });

      // Submit
      const loginButton = screen.getByRole('button', { name: /Entrar/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/clock');
      });
    });

    it('should prevent multiple simultaneous login attempts', async () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      const idInput = screen.getByPlaceholderText(/ID/i);
      const pinInput = screen.getByPlaceholderText('PIN');
      const loginButton = screen.getByRole('button', { name: /Entrar/i });

      fireEvent.change(idInput, { target: { value: '1' } });
      fireEvent.change(pinInput, { target: { value: '1234' } });

      // Rapid clicks
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);

      // Should only call once
      expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security', () => {
    it('should clear sensitive data on unmount', () => {
      const { unmount } = render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      const adminTab = screen.getByText('Administração');
      fireEvent.click(adminTab);

      const passwordInput = screen.getByPlaceholderText('••••••••');
      fireEvent.change(passwordInput, { target: { value: 'sensitive123' } });

      unmount();

      // Verify cleanup (password should be cleared from memory)
      expect((passwordInput as HTMLInputElement).value).toBeUndefined();
    });
  });
});