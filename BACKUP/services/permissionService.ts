/**
 * Permission Service
 * Manages role-based permissions and access control
 */

import { supabase } from './supabaseClient';
import { Permission } from '../types/auth';

export const permissionService = {
    // Fetch all available permissions
    async getAllPermissions(): Promise<Permission[]> {
        const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .order('category', { ascending: true })
            .order('description', { ascending: true });

        if (error) {
            console.error('Error fetching permissions:', error);
            return [];
        }
        return data || [];
    },

    // Fetch permissions for a specific role
    async getRolePermissions(roleId: number): Promise<string[]> {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('permission_code')
            .eq('role_id', roleId);

        if (error) {
            console.error('Error fetching role permissions:', error);
            return [];
        }
        return data?.map((p: any) => p.permission_code) || [];
    },

    // Update permissions for a role (Bulk replace or Toggle)
    // For simplicity, we'll implement toggle for now, but usually bulk replace is safer for sync
    async togglePermission(roleId: number, permissionCode: string, grant: boolean) {
        if (grant) {
            const { error } = await supabase
                .from('role_permissions')
                .insert({ role_id: roleId, permission_code: permissionCode });

            if (error && error.code !== '23505') { // Ignore duplicate key error
                throw error;
            }
        } else {
            const { error } = await supabase
                .from('role_permissions')
                .delete()
                .eq('role_id', roleId)
                .eq('permission_code', permissionCode);

            if (error) throw error;
        }
    },

    // Fetch permissions for a specific user based on their role
    // This helps if we want to get permissions dynamically without full session reload
    async getUserPermissions(roleName: string): Promise<string[]> {
        // First find the role ID from the name
        const { data: roleData, error: roleError } = await supabase
            .from('job_roles')
            .select('id')
            .eq('name', roleName)
            .single();

        if (roleError || !roleData) return [];

        return this.getRolePermissions(roleData.id);
    }
};
