import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { TimeLog, TimeLogStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';

/**
 * Hook to fetch time logs
 *
 * Features:
 * - Automatically filters by user role (admin sees all, employee sees own)
 * - Defaults to last 7 days
 * - Stale after 30 seconds (time logs are frequently updated)
 * - Only fetches if user is authenticated
 *
 * Usage:
 * const { data: timeLogs, isLoading } = useTimeLogs();
 * const { data: lastMonth } = useTimeLogs('2026-02-01');
 */
export function useTimeLogs(dateFrom?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['timeLogs', user?.id, dateFrom],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Default to last 7 days
      const defaultDate = dateFrom || (() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return sevenDaysAgo.toISOString().split('T')[0];
      })();

      console.log(`[useTimeLogs] Fetching logs from ${defaultDate}...`);

      // Build query
      let query = supabase
        .from('time_logs')
        .select('*')
        .gte('date', defaultDate)
        .order('date', { ascending: false })
        .order('check_in', { ascending: false });

      // Filter by user role
      const roleStr = (user.role || '').toUpperCase();
      const canViewAll = ['ADMIN', 'AUDITOR', 'RH', 'RESPONSÁVEL DE DEPARTAMENTO'].includes(roleStr);

      if (!canViewAll) {
        console.log(`[useTimeLogs] Regular user - filtering by user_id: ${user.id}`);
        query = query.eq('user_id', user.id);
      } else {
        console.log(`[useTimeLogs] Management user - loading ALL users' logs`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useTimeLogs] ❌ Supabase error:', error);
        throw error;
      }

      const logs: TimeLog[] = data.map((l: any) => ({
        id: l.id,
        userId: l.user_id,
        date: l.date,
        checkIn: l.check_in,
        checkOut: l.check_out,
        status: l.status as TimeLogStatus,
        checkInLocation: l.check_in_location,
        checkInIp: l.check_in_ip,
        checkInCoordinates: l.check_in_coordinates,
        checkOutLocation: l.check_out_location,
        checkOutIp: l.check_out_ip,
        checkOutCoordinates: l.check_out_coordinates,
        totalHours: l.total_hours,
        normalHours: l.normal_hours,
        overtimeHours: l.overtime_hours,
        breakMinutes: l.break_minutes,
        comments: l.comments,
        managerComments: l.manager_comments,
        createdBy: l.created_by,
        checkInMethod: l.check_in_method,
        checkOutMethod: l.check_out_method
      }));

      console.log(`[useTimeLogs] ✅ Loaded ${logs.length} logs from ${defaultDate}`);

      const today = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter(l => l.date === today);
      console.log(`[useTimeLogs] 📊 Today's logs: ${todayLogs.length}/${logs.length}`);

      return logs;
    },

    // Time logs are updated frequently, stale after 30 seconds
    staleTime: 1000 * 30,

    // Keep in cache for 2 minutes
    gcTime: 1000 * 60 * 2,

    // Only fetch if user is authenticated
    enabled: !!user,

    // Refetch on window focus (important for time tracking)
    refetchOnWindowFocus: true,

    // Retry on failure
    retry: 2,
  });
}
