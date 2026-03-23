import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { Location } from '../../types';

/**
 * Hook to fetch all locations
 *
 * Locations rarely change, so we cache them for 5 minutes
 */
export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      console.log('[useLocations] Fetching locations...');

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[useLocations] ❌ Error:', error);
        throw error;
      }

      const locations: Location[] = data.map((l: any) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        coordinates: l.coordinates,
        radius: l.radius,
        isActive: l.is_active,
        createdAt: l.created_at
      }));

      console.log(`[useLocations] ✅ Loaded ${locations.length} locations`);
      return locations;
    },

    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
