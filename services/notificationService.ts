/**
 * Notification Service
 * Handles persistent notifications for users with database storage
 */

import { supabase } from './supabaseClient';
import { PersistentNotification, NotificationCategory, NotificationSeverity, NotificationActionType } from '../types';
import { errorHandler } from '../utils/errorHandler';

const mapRow = (row: any): PersistentNotification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as NotificationCategory,
  title: row.title,
  description: row.description,
  severity: row.severity as NotificationSeverity,
  read: row.read,
  actionType: row.action_type as NotificationActionType,
  referenceId: row.reference_id,
  referenceTable: row.reference_table,
  actionUrl: row.action_url,
  createdAt: row.created_at,
});

export interface CreateNotificationParams {
  userId: number;
  type: NotificationCategory;
  title: string;
  description: string;
  severity?: NotificationSeverity;
  actionType?: NotificationActionType;
  referenceId?: string | number;
  referenceTable?: string;
  actionUrl?: string;
}

export const notificationService = {

  async getByUser(userId: number, limit = 50): Promise<PersistentNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(mapRow);
    } catch (error) {
      errorHandler.handleSilent(error, 'notificationService.getByUser');
      return [];
    }
  },

  async getUnreadCount(userId: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      errorHandler.handleSilent(error, 'notificationService.getUnreadCount');
      return 0;
    }
  },

  async create(params: CreateNotificationParams): Promise<PersistentNotification | null> {
    try {
      const { data, error } = await supabase.from('notifications').insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        description: params.description,
        severity: params.severity || 'info',
        action_type: params.actionType || null,
        reference_id: params.referenceId ? String(params.referenceId) : null,
        reference_table: params.referenceTable || null,
        action_url: params.actionUrl || null,
      }).select().single();

      if (error) throw error;
      return data ? mapRow(data) : null;
    } catch (error) {
      errorHandler.handle(error, 'notificationService.create');
      return null;
    }
  },

  async createBulk(
    userIds: number[],
    params: Omit<CreateNotificationParams, 'userId'>
  ): Promise<void> {
    if (userIds.length === 0) return;
    const rows = userIds.map(uid => ({
      user_id: uid,
      type: params.type,
      title: params.title,
      description: params.description,
      severity: params.severity || 'info',
      action_type: params.actionType || null,
      reference_id: params.referenceId ? String(params.referenceId) : null,
      reference_table: params.referenceTable || null,
      action_url: params.actionUrl || null,
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) console.error('Error bulk creating notifications:', error);
  },

  async markRead(id: number): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  async markAllRead(userId: number): Promise<void> {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  },
};
