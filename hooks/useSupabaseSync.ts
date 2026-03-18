/**
 * Hook para sincronização com Supabase
 * Extrai lógica de sync do App.tsx
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, Leave, Anomaly, TimeLog } from '../types';

interface UseSupabaseSyncProps {
  setUsers: (users: User[]) => void;
  setLeaves: (leaves: Leave[]) => void;
  setAnomalies: (anomalies: Anomaly[]) => void;
  setTimeLogs: (logs: TimeLog[]) => void;
  setLoading: (loading: boolean) => void;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const useSupabaseSync = ({
  setUsers,
  setLeaves,
  setAnomalies,
  setTimeLogs,
  setLoading,
  addToast
}: UseSupabaseSyncProps) => {

  // Fetch Users - Optimized query
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, email, role, code, pin,
          photo_url, department, position, status,
          work_start_time, work_end_time,
          lunch_start, lunch_end
        `)
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;

      if (data) {
        setUsers(data.map(user => ({
          ...user,
          photoUrl: user.photo_url,
          workStartTime: user.work_start_time,
          workEndTime: user.work_end_time,
          lunchStart: user.lunch_start,
          lunchEnd: user.lunch_end
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      addToast('error', 'Erro ao carregar utilizadores');
    }
  }, [setUsers, addToast]);

  // Fetch Leaves
  const fetchLeaves = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setLeaves(data.map(leave => ({
          ...leave,
          userId: leave.user_id,
          startDate: leave.start_date,
          endDate: leave.end_date,
          createdAt: leave.created_at,
          updatedAt: leave.updated_at
        })));
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  }, [setLeaves]);

  // Fetch Anomalies
  const fetchAnomalies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('anomalies')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        setAnomalies(data.map(anomaly => ({
          ...anomaly,
          userId: anomaly.user_id,
          timeLogId: anomaly.time_log_id,
          createdAt: anomaly.created_at,
          updatedAt: anomaly.updated_at,
          resolvedAt: anomaly.resolved_at,
          resolvedBy: anomaly.resolved_by
        })));
      }
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    }
  }, [setAnomalies]);

  // Fetch Time Logs
  const fetchTimeLogs = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        setTimeLogs(data.map(log => ({
          ...log,
          userId: log.user_id,
          checkIn: log.check_in,
          checkOut: log.check_out,
          breakStart: log.break_start,
          breakEnd: log.break_end,
          totalHours: log.total_hours,
          createdAt: log.created_at,
          updatedAt: log.updated_at
        })));
      }
    } catch (error) {
      console.error('Error fetching time logs:', error);
    }
  }, [setTimeLogs]);

  // Initial fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchLeaves(),
      fetchAnomalies(),
      fetchTimeLogs()
    ]);
    setLoading(false);
  }, [fetchUsers, fetchLeaves, fetchAnomalies, fetchTimeLogs, setLoading]);

  // Setup real-time subscriptions
  useEffect(() => {
    // Initial fetch
    fetchAllData();

    // Users subscription
    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => fetchUsers()
      )
      .subscribe();

    // Time logs subscription
    const timeLogsSubscription = supabase
      .channel('time-logs-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'time_logs' },
        () => fetchTimeLogs()
      )
      .subscribe();

    // Leaves subscription
    const leavesSubscription = supabase
      .channel('leaves-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => fetchLeaves()
      )
      .subscribe();

    // Anomalies subscription
    const anomaliesSubscription = supabase
      .channel('anomalies-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'anomalies' },
        () => fetchAnomalies()
      )
      .subscribe();

    // Cleanup
    return () => {
      usersSubscription.unsubscribe();
      timeLogsSubscription.unsubscribe();
      leavesSubscription.unsubscribe();
      anomaliesSubscription.unsubscribe();
    };
  }, []);

  return {
    refetch: fetchAllData,
    refetchUsers: fetchUsers,
    refetchLeaves: fetchLeaves,
    refetchAnomalies: fetchAnomalies,
    refetchTimeLogs: fetchTimeLogs
  };
};