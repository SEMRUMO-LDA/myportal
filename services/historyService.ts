/**
 * History Service
 * Manages user history logs and audit trail for data changes
 */

import { supabase } from './supabaseClient';
import { UserHistoryLog, User } from '../types';
import { errorHandler } from '../utils/errorHandler';

export const historyService = {
    /**
     * Fetch history logs for a specific user
     */
    async getLogs(userId: number): Promise<UserHistoryLog[]> {
        try {
            const { data, error } = await supabase
                .from('user_history_logs')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (error) throw error;

            return data.map(log => ({
                id: log.id,
                date: new Date(log.date).toLocaleString('pt-PT'),
                action: log.action,
                field: log.field,
                oldValue: log.old_value,
                newValue: log.new_value,
                changedBy: log.changed_by
            }));
        } catch (error) {
            errorHandler.handleSilent(error, 'historyService.getLogs');
            return [];
        }
    },

    /**
     * Log a user action (Create/Update)
     */
    async logAction(
        userId: number,
        action: 'CREATE' | 'UPDATE' | 'DELETE',
        changedBy: string,
        details?: { field?: string; oldValue?: string; newValue?: string }
    ) {
        try {
            const { error } = await supabase.from('user_history_logs').insert({
                user_id: userId,
                action,
                changed_by: changedBy,
                field: details?.field,
                old_value: details?.oldValue,
                new_value: details?.newValue,
                date: new Date().toISOString()
            });

            if (error) throw error;
        } catch (error) {
            errorHandler.handleSilent(error, 'historyService.logAction');
        }
    },

    /**
     * Compare two user objects and log changes
     */
    async logChanges(oldUser: User, newUser: User, changedBy: string) {
        const ignoredFields = ['updated_at', 'last_login', 'photoUrl', 'documents', 'created_at', 'id']; // Fields to ignore
        const changes: { field: string; old: any; new: any }[] = [];

        // Compare fields
        (Object.keys(newUser) as (keyof User)[]).forEach(key => {
            if (ignoredFields.includes(key)) return;

            const v1 = oldUser[key];
            const v2 = newUser[key];

            // Deep comparison for objects (like attendanceConfig)
            if (JSON.stringify(v1) !== JSON.stringify(v2)) {
                changes.push({
                    field: key,
                    old: v1,
                    new: v2
                });
            }
        });

        // Log each change
        for (const change of changes) {
            let oldVal = '';
            let newVal = '';

            if (typeof change.old === 'object') {
                oldVal = JSON.stringify(change.old);
            } else {
                oldVal = String(change.old || '');
            }

            if (typeof change.new === 'object') {
                newVal = JSON.stringify(change.new);
            } else {
                newVal = String(change.new || '');
            }

            // Clean up overly verbose JSONs? Maybe just log "Changed" for long configs
            if (oldVal.length > 100) oldVal = oldVal.substring(0, 100) + '...';
            if (newVal.length > 100) newVal = newVal.substring(0, 100) + '...';

            await this.logAction(newUser.id, 'UPDATE', changedBy, {
                field: change.field,
                oldValue: oldVal,
                newValue: newVal
            });
        }
    }
};
