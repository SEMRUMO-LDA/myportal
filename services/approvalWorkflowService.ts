/**
 * APPROVAL WORKFLOW SERVICE
 * Sistema flexível e configurável de aprovação de férias
 *
 * Features:
 * - Multi-level approval chains
 * - Parallel vs Sequential approvals
 * - Auto-approval rules
 * - Delegation support
 * - Timeout & escalation
 */

import { supabase } from './supabaseClient';
import {
  ApprovalWorkflow,
  ApprovalStep,
  AutoApprovalRule,
  LeaveApproval,
  ApprovalDelegation,
  ApprovalChainResult,
  Leave,
  LeaveWithWorkflow,
  ApprovalStatus
} from '../types';

class ApprovalWorkflowService {

  // ================================================================
  // WORKFLOW MANAGEMENT
  // ================================================================

  /**
   * Get workflow for a leave type
   */
  async getWorkflowForLeaveType(leaveTypeId: number): Promise<ApprovalWorkflow | null> {
    const { data, error } = await supabase
      .from('approval_workflows')
      .select('*')
      .eq('leave_type_id', leaveTypeId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return this.mapWorkflow(data);
  }

  /**
   * Get all steps for a workflow
   */
  async getWorkflowSteps(workflowId: number): Promise<ApprovalStep[]> {
    const { data, error } = await supabase
      .from('approval_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true });

    if (error || !data) return [];

    return data.map(this.mapStep);
  }

  /**
   * Check if leave can be auto-approved
   */
  async canAutoApprove(leave: Partial<Leave>, userId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('can_auto_approve', {
        p_leave_id: leave.id
      });

      if (error) {
        console.error('[ApprovalWorkflow] Auto-approve check failed:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('[ApprovalWorkflow] Auto-approve error:', error);
      return false;
    }
  }

  /**
   * Get auto-approval rules for leave type
   */
  async getAutoApprovalRules(leaveTypeId: number, departmentId?: number): Promise<AutoApprovalRule | null> {
    let query = supabase
      .from('auto_approval_rules')
      .select('*')
      .eq('leave_type_id', leaveTypeId)
      .eq('is_active', true);

    if (departmentId) {
      query = query.or(`department_id.eq.${departmentId},department_id.is.null`);
    } else {
      query = query.is('department_id', null);
    }

    const { data, error } = await query
      .order('max_days', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;

    return this.mapAutoApprovalRule(data);
  }

  // ================================================================
  // APPROVAL CHAIN
  // ================================================================

  /**
   * Get complete approval chain for a leave
   */
  async getApprovalChain(leaveId: number): Promise<ApprovalChainResult> {
    try {
      // Get leave with workflow
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select(`
          *,
          approval_workflows (*)
        `)
        .eq('id', leaveId)
        .single();

      if (leaveError || !leaveData) {
        return { canAutoApprove: false, isComplete: false };
      }

      // Check if auto-approved
      if (leaveData.is_auto_approved) {
        return {
          canAutoApprove: true,
          isComplete: true
        };
      }

      const workflow = leaveData.approval_workflows;
      if (!workflow) {
        return { canAutoApprove: false, isComplete: false };
      }

      // Get steps
      const steps = await this.getWorkflowSteps(workflow.id);

      // Get approvals
      const approvals = await this.getLeaveApprovals(leaveId);

      // Determine current approver
      const currentStep = steps.find(s => s.stepOrder === leaveData.current_step_order);
      let currentApprover = null;

      if (currentStep) {
        const approverInfo = await this.getNextApprover(leaveId, currentStep.stepOrder);
        if (approverInfo) {
          currentApprover = approverInfo;
        }
      }

      // Check if complete
      const isComplete = approvals.every(a => a.status === 'APPROVED' || a.status === 'SKIPPED');

      return {
        canAutoApprove: false,
        workflow: this.mapWorkflow(workflow),
        steps,
        currentApprover,
        pendingApprovals: approvals.filter(a => a.status === 'PENDING'),
        isComplete
      };
    } catch (error) {
      console.error('[ApprovalWorkflow] Get chain error:', error);
      return { canAutoApprove: false, isComplete: false };
    }
  }

  /**
   * Get next approver (with delegation support)
   */
  async getNextApprover(leaveId: number, stepOrder: number): Promise<{
    userId: number;
    name: string;
    isDelegated: boolean;
    delegateName?: string;
  } | null> {
    try {
      const { data, error } = await supabase.rpc('get_next_approver', {
        p_leave_id: leaveId,
        p_step_order: stepOrder
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const approver = data[0];

      // Get name
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', approver.approver_id)
        .single();

      return {
        userId: approver.approver_id,
        name: userData?.name || 'Unknown',
        isDelegated: approver.is_delegated || false,
        delegateName: approver.delegate_name
      };
    } catch (error) {
      console.error('[ApprovalWorkflow] Get next approver error:', error);
      return null;
    }
  }

  /**
   * Get all approvals for a leave
   */
  async getLeaveApprovals(leaveId: number): Promise<LeaveApproval[]> {
    const { data, error } = await supabase
      .from('leave_approvals')
      .select(`
        *,
        users:approver_user_id (name)
      `)
      .eq('leave_id', leaveId)
      .order('step_order', { ascending: true });

    if (error || !data) return [];

    return data.map(a => ({
      id: a.id,
      leaveId: a.leave_id,
      stepId: a.step_id,
      stepOrder: a.step_order,
      approverUserId: a.approver_user_id,
      approverName: a.users?.name,
      status: a.status as ApprovalStatus,
      notes: a.notes,
      respondedAt: a.responded_at,
      escalatedAt: a.escalated_at,
      createdAt: a.created_at
    }));
  }

  // ================================================================
  // APPROVAL ACTIONS
  // ================================================================

  /**
   * Approve a leave request
   */
  async approveLease(
    leaveId: number,
    approverId: number,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current approval
      const { data: currentApproval, error: approvalError } = await supabase
        .from('leave_approvals')
        .select('*')
        .eq('leave_id', leaveId)
        .eq('approver_user_id', approverId)
        .eq('status', 'PENDING')
        .single();

      if (approvalError || !currentApproval) {
        return { success: false, error: 'Approval not found or already processed' };
      }

      // Update approval
      const { error: updateError } = await supabase
        .from('leave_approvals')
        .update({
          status: 'APPROVED',
          notes,
          responded_at: new Date().toISOString()
        })
        .eq('id', currentApproval.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Check if this was the last step
      const { data: pendingApprovals } = await supabase
        .from('leave_approvals')
        .select('id')
        .eq('leave_id', leaveId)
        .eq('status', 'PENDING');

      // If no more pending approvals, approve the leave
      if (!pendingApprovals || pendingApprovals.length === 0) {
        await supabase
          .from('leaves')
          .update({
            status: 'APPROVED',
            approved_by: approverId,
            approved_at: new Date().toISOString()
          })
          .eq('id', leaveId);
      } else {
        // Move to next step
        await supabase
          .from('leaves')
          .update({
            current_step_order: currentApproval.step_order + 1
          })
          .eq('id', leaveId);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[ApprovalWorkflow] Approve error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a leave request
   */
  async rejectLeave(
    leaveId: number,
    approverId: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update approval
      const { error: approvalError } = await supabase
        .from('leave_approvals')
        .update({
          status: 'REJECTED',
          notes: reason,
          responded_at: new Date().toISOString()
        })
        .eq('leave_id', leaveId)
        .eq('approver_user_id', approverId)
        .eq('status', 'PENDING');

      if (approvalError) {
        return { success: false, error: approvalError.message };
      }

      // Reject the leave
      const { error: leaveError } = await supabase
        .from('leaves')
        .update({
          status: 'REJECTED',
          rejected_reason: reason,
          approved_by: approverId,
          approved_at: new Date().toISOString()
        })
        .eq('id', leaveId);

      if (leaveError) {
        return { success: false, error: leaveError.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[ApprovalWorkflow] Reject error:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  // DELEGATION
  // ================================================================

  /**
   * Create approval delegation
   */
  async createDelegation(delegation: Omit<ApprovalDelegation, 'id' | 'createdAt'>): Promise<ApprovalDelegation | null> {
    const { data, error } = await supabase
      .from('approval_delegations')
      .insert({
        delegator_id: delegation.delegatorId,
        delegate_id: delegation.delegateId,
        start_date: delegation.startDate,
        end_date: delegation.endDate,
        reason: delegation.reason,
        is_active: delegation.isActive
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[ApprovalWorkflow] Create delegation error:', error);
      return null;
    }

    return this.mapDelegation(data);
  }

  /**
   * Get active delegations for user
   */
  async getActiveDelegations(userId: number): Promise<ApprovalDelegation[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('approval_delegations')
      .select(`
        *,
        delegator:delegator_id (name),
        delegate:delegate_id (name)
      `)
      .eq('delegator_id', userId)
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today);

    if (error || !data) return [];

    return data.map(this.mapDelegation);
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(delegationId: number): Promise<boolean> {
    const { error } = await supabase
      .from('approval_delegations')
      .update({ is_active: false })
      .eq('id', delegationId);

    return !error;
  }

  // ================================================================
  // PENDING APPROVALS
  // ================================================================

  /**
   * Get pending approvals for user
   */
  async getPendingApprovalsForUser(userId: number): Promise<LeaveWithWorkflow[]> {
    const { data, error } = await supabase
      .from('leave_approvals')
      .select(`
        *,
        leaves (
          *,
          users (name, department, photo_url),
          leave_types (name, color),
          approval_workflows (*)
        )
      `)
      .eq('approver_user_id', userId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(a => {
      const leave = a.leaves as any;
      return {
        ...leave,
        userName: leave.users?.name,
        userDepartment: leave.users?.department,
        leaveTypeName: leave.leave_types?.name,
        leaveTypeColor: leave.leave_types?.color,
        workflow: leave.approval_workflows,
        workflowId: leave.workflow_id,
        currentStepOrder: leave.current_step_order,
        isAutoApproved: leave.is_auto_approved,
        approvalDeadline: leave.approval_deadline
      };
    });
  }

  // ================================================================
  // MAPPERS
  // ================================================================

  private mapWorkflow(data: any): ApprovalWorkflow {
    return {
      id: data.id,
      leaveTypeId: data.leave_type_id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      isParallel: data.is_parallel,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by
    };
  }

  private mapStep(data: any): ApprovalStep {
    return {
      id: data.id,
      workflowId: data.workflow_id,
      stepOrder: data.step_order,
      stepName: data.step_name,
      approverRole: data.approver_role,
      approverUserId: data.approver_user_id,
      isRequired: data.is_required,
      timeoutDays: data.timeout_days,
      escalateToUserId: data.escalate_to_user_id,
      skipCondition: data.skip_condition,
      createdAt: data.created_at
    };
  }

  private mapAutoApprovalRule(data: any): AutoApprovalRule {
    return {
      id: data.id,
      leaveTypeId: data.leave_type_id,
      maxDays: data.max_days,
      minNoticeDays: data.min_notice_days,
      requiresBackup: data.requires_backup,
      departmentId: data.department_id,
      conditions: data.conditions,
      isActive: data.is_active,
      createdAt: data.created_at
    };
  }

  private mapDelegation(data: any): ApprovalDelegation {
    return {
      id: data.id,
      delegatorId: data.delegator_id,
      delegateId: data.delegate_id,
      delegatorName: data.delegator?.name,
      delegateName: data.delegate?.name,
      startDate: data.start_date,
      endDate: data.end_date,
      reason: data.reason,
      isActive: data.is_active,
      createdAt: data.created_at
    };
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();
