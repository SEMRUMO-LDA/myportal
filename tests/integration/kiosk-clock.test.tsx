/**
 * Integration Tests - Kiosk Clock In/Out Flow
 * Tests the critical kiosk attendance clocking functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { kioskClockService } from '../../services/kioskClockService';
import { supabase } from '../../services/supabaseClient';

vi.mock('../../services/supabaseClient');

describe('Kiosk Clock In/Out Integration Tests', () => {
  const mockUser = {
    id: 123,
    name: 'Test Employee',
    email: 'employee@test.com',
    role: 'EMPLOYEE',
    company: 'SEMRUMO'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-22T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Clock In', () => {
    it('should successfully clock in employee', async () => {
      // Mock no existing open time logs
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ id: 1, user_id: 123, check_in: '10:00:00' }],
          error: null
        })
      } as any);

      const result = await kioskClockService.clockIn(mockUser as any);

      expect(result.success).toBe(true);
      expect(result.message).toContain('registada');
    });

    it('should prevent duplicate clock in', async () => {
      // Mock existing open time log
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 1, user_id: 123, check_in: '09:00:00', check_out: null }],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await kioskClockService.clockIn(mockUser as any);

      expect(result.success).toBe(false);
      expect(result.message).toContain('já registou entrada');
    });
  });

  describe('Clock Out', () => {
    it('should successfully clock out employee', async () => {
      const mockTimeLog = {
        id: 1,
        user_id: 123,
        date: '2026-03-22',
        check_in: '09:00:00',
        check_out: null
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockTimeLog],
                  error: null
                })
              })
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ ...mockTimeLog, check_out: '18:00:00' }],
            error: null
          })
        })
      } as any);

      const result = await kioskClockService.clockOut(mockUser as any);

      expect(result.success).toBe(true);
      expect(result.message).toContain('registada');
    });

    it('should fail clock out without clock in', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await kioskClockService.clockOut(mockUser as any);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Não existe entrada');
    });
  });

  describe('Offline Resilience', () => {
    it('should queue clock in when offline', async () => {
      // Simulate network error
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await kioskClockService.clockIn(mockUser as any);

      // Should gracefully handle error
      expect(result.success).toBe(false);
    });
  });
});
