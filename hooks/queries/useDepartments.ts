import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { Department } from '../../types';

/**
 * Hook to fetch all departments
 */
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      console.log('[useDepartments] Fetching departments...');

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[useDepartments] ❌ Error:', error);
        throw error;
      }

      const departments: Department[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        managerId: d.manager_id,
        createdAt: d.created_at
      }));

      console.log(`[useDepartments] ✅ Loaded ${departments.length} departments`);
      return departments;
    },

    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });
}
