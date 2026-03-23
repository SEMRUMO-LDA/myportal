import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { Leave, LeaveStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';

/**
 * Hook to fetch leaves (vacation requests)
 *
 * Automatically filters by user role
 */
export function useLeaves() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leaves', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[useLeaves] Fetching leaves...');

      let query = supabase
        .from('leaves')
        .select('*')
        .order('start_date', { ascending: false });

      // Filter by user role
      const roleStr = (user.role || '').toUpperCase();
      const canViewAll = ['ADMIN', 'AUDITOR', 'RH', 'RESPONSÁVEL DE DEPARTAMENTO'].includes(roleStr);

      if (!canViewAll) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useLeaves] ❌ Error:', error);
        throw error;
      }

      // Normalize status for legacy data
      const normalizeLeaveStatus = (status: string): LeaveStatus => {
        if (!status) return 'PENDING';
        const s = status.toUpperCase();
        if (s === 'PENDING' || s === 'PENDENTE') return 'PENDING';
        if (s === 'APPROVED' || s === 'APROVADO') return 'APPROVED';
        if (s === 'REJECTED' || s === 'REJEITADO') return 'REJECTED';
        return 'PENDING';
      };

      const leaves: Leave[] = data.map((l: any) => ({
        id: l.id,
        userId: l.user_id,
        leaveTypeId: l.leave_type_id,
        startDate: l.start_date,
        endDate: l.end_date,
        totalDays: l.total_days,
        reason: l.reason,
        status: normalizeLeaveStatus(l.status),
        approvedBy: l.approved_by,
        approvedAt: l.approved_at,
        rejectedBy: l.rejected_by,
        rejectedAt: l.rejected_at,
        rejectionReason: l.rejection_reason,
        createdAt: l.created_at,
        attachments: l.attachments
      }));

      console.log(`[useLeaves] ✅ Loaded ${leaves.length} leaves`);
      return leaves;
    },

    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5,
    enabled: !!user,
  });
}
