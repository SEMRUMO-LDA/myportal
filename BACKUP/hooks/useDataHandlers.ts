/**
 * Hook para handlers de dados
 * Extrai lógica de CRUD do App.tsx
 */

import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, Leave, Anomaly, TimeLog, Announcement } from '../types';

interface UseDataHandlersProps {
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  refetchUsers?: () => Promise<void>;
  refetchLeaves?: () => Promise<void>;
  refetchAnomalies?: () => Promise<void>;
  refetchTimeLogs?: () => Promise<void>;
}

export const useDataHandlers = ({
  addToast,
  refetchUsers,
  refetchLeaves,
  refetchAnomalies,
  refetchTimeLogs
}: UseDataHandlersProps) => {

  // User handlers
  const handleAddUser = useCallback(async (user: Omit<User, 'id'>) => {
    try {
      const { error } = await supabase.from('users').insert([{
        ...user,
        photo_url: user.photoUrl,
        work_start_time: user.workStartTime,
        work_end_time: user.workEndTime,
        lunch_start: user.lunchStart,
        lunch_end: user.lunchEnd
      }]);

      if (error) throw error;

      addToast('success', 'Utilizador adicionado com sucesso.');
      if (refetchUsers) await refetchUsers();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao adicionar utilizador.');
      console.error('Error adding user:', error);
    }
  }, [addToast, refetchUsers]);

  const handleEditUser = useCallback(async (user: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...user,
          photo_url: user.photoUrl,
          work_start_time: user.workStartTime,
          work_end_time: user.workEndTime,
          lunch_start: user.lunchStart,
          lunch_end: user.lunchEnd
        })
        .eq('id', user.id);

      if (error) throw error;

      addToast('success', 'Utilizador atualizado com sucesso.');
      if (refetchUsers) await refetchUsers();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao atualizar utilizador.');
      console.error('Error updating user:', error);
    }
  }, [addToast, refetchUsers]);

  const handleDeleteUser = useCallback(async (userId: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      addToast('success', 'Utilizador removido com sucesso.');
      if (refetchUsers) await refetchUsers();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao remover utilizador.');
      console.error('Error deleting user:', error);
    }
  }, [addToast, refetchUsers]);

  // Leave handlers
  const handleAddLeave = useCallback(async (leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { error } = await supabase.from('leaves').insert([{
        user_id: leave.userId,
        type: leave.type,
        start_date: leave.startDate,
        end_date: leave.endDate,
        reason: leave.reason,
        status: leave.status
      }]);

      if (error) throw error;

      addToast('success', 'Licença adicionada com sucesso.');
      if (refetchLeaves) await refetchLeaves();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao adicionar licença.');
      console.error('Error adding leave:', error);
    }
  }, [addToast, refetchLeaves]);

  const handleEditLeave = useCallback(async (leave: Leave) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .update({
          type: leave.type,
          start_date: leave.startDate,
          end_date: leave.endDate,
          reason: leave.reason,
          status: leave.status
        })
        .eq('id', leave.id);

      if (error) throw error;

      addToast('success', 'Licença atualizada com sucesso.');
      if (refetchLeaves) await refetchLeaves();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao atualizar licença.');
      console.error('Error updating leave:', error);
    }
  }, [addToast, refetchLeaves]);

  const handleDeleteLeave = useCallback(async (leaveId: number) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leaveId);

      if (error) throw error;

      addToast('success', 'Licença removida com sucesso.');
      if (refetchLeaves) await refetchLeaves();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao remover licença.');
      console.error('Error deleting leave:', error);
    }
  }, [addToast, refetchLeaves]);

  // Anomaly handlers
  const handleAddAnomaly = useCallback(async (anomaly: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { error } = await supabase.from('anomalies').insert([{
        user_id: anomaly.userId,
        date: anomaly.date,
        type: anomaly.type,
        description: anomaly.description,
        time_log_id: anomaly.timeLogId,
        status: anomaly.status || 'PENDING'
      }]);

      if (error) throw error;

      addToast('success', 'Anomalia registada com sucesso.');
      if (refetchAnomalies) await refetchAnomalies();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao registar anomalia.');
      console.error('Error adding anomaly:', error);
    }
  }, [addToast, refetchAnomalies]);

  const handleUpdateAnomaly = useCallback(async (anomaly: Anomaly, silent: boolean = false) => {
    try {
      const updateData: any = {
        type: anomaly.type,
        description: anomaly.description,
        status: anomaly.status,
        admin_notes: anomaly.adminNotes
      };

      if (anomaly.status === 'RESOLVED') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('anomalies')
        .update(updateData)
        .eq('id', anomaly.id);

      if (error) throw error;

      if (!silent) {
        addToast('success', 'Anomalia atualizada.');
      }
      if (refetchAnomalies) await refetchAnomalies();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao atualizar anomalia.');
      console.error('Error updating anomaly:', error);
    }
  }, [addToast, refetchAnomalies]);

  const handleDeleteAnomaly = useCallback(async (anomalyId: number) => {
    try {
      const { error } = await supabase
        .from('anomalies')
        .delete()
        .eq('id', anomalyId);

      if (error) throw error;

      addToast('success', 'Anomalia removida com sucesso.');
      if (refetchAnomalies) await refetchAnomalies();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao remover anomalia.');
      console.error('Error deleting anomaly:', error);
    }
  }, [addToast, refetchAnomalies]);

  // TimeLog handler
  const handleManualTimeLog = useCallback(async (timeLog: Omit<TimeLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { error } = await supabase.from('time_logs').insert([{
        user_id: timeLog.userId,
        date: timeLog.date,
        check_in: timeLog.checkIn,
        check_out: timeLog.checkOut,
        break_start: timeLog.breakStart,
        break_end: timeLog.breakEnd,
        total_hours: timeLog.totalHours,
        status: timeLog.status
      }]);

      if (error) throw error;

      addToast('success', 'Registo manual adicionado com sucesso.');
      if (refetchTimeLogs) await refetchTimeLogs();
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao adicionar registo manual.');
      console.error('Error adding manual time log:', error);
    }
  }, [addToast, refetchTimeLogs]);

  // Announcement handler
  const handleAddAnnouncement = useCallback(async (announcement: Omit<Announcement, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase.from('announcements').insert([{
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        active: announcement.active,
        expires_at: announcement.expiresAt
      }]);

      if (error) throw error;

      addToast('success', 'Anúncio publicado com sucesso.');
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao publicar anúncio.');
      console.error('Error adding announcement:', error);
    }
  }, [addToast]);

  return {
    // Users
    handleAddUser,
    handleEditUser,
    handleDeleteUser,
    // Leaves
    handleAddLeave,
    handleEditLeave,
    handleDeleteLeave,
    // Anomalies
    handleAddAnomaly,
    handleUpdateAnomaly,
    handleDeleteAnomaly,
    // TimeLogs
    handleManualTimeLog,
    // Announcements
    handleAddAnnouncement
  };
};