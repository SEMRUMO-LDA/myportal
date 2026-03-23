import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

/**
 * IndexedDB Persister for React Query
 * Stores query cache in IndexedDB for persistence across sessions
 */
const idbPersister = {
  persistClient: async (client: any) => {
    try {
      await set('MYPORTAL_QUERY_CACHE', client);
      console.log('[QueryClient] Cache persisted to IndexedDB');
    } catch (error) {
      console.error('[QueryClient] Failed to persist cache:', error);
    }
  },
  restoreClient: async () => {
    try {
      const cache = await get('MYPORTAL_QUERY_CACHE');
      if (cache) {
        console.log('[QueryClient] Cache restored from IndexedDB');
      }
      return cache;
    } catch (error) {
      console.error('[QueryClient] Failed to restore cache:', error);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await del('MYPORTAL_QUERY_CACHE');
      console.log('[QueryClient] Cache cleared from IndexedDB');
    } catch (error) {
      console.error('[QueryClient] Failed to clear cache:', error);
    }
  }
};

/**
 * Global QueryClient instance
 *
 * Configuration:
 * - gcTime: 5 minutes (how long to keep unused data in cache)
 * - staleTime: 1 minute (data considered fresh for 1 min)
 * - refetchOnWindowFocus: true (refetch stale data when user returns to tab)
 * - refetchOnMount: false (don't refetch if we have fresh data)
 * - retry: 2 (retry failed queries twice)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      staleTime: 1000 * 60 * 1, // 1 minute

      // Refetch strategy
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: false, // IMPORTANT: don't refetch if we have cache

      // Error handling
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Prevent unnecessary renders
      structuralSharing: true,
      notifyOnChangeProps: 'all',
    },
    mutations: {
      // Mutations don't need retry by default
      retry: false,
    },
  },
});

/**
 * Initialize cache persistence
 * Cache will be saved to IndexedDB and restored on app load
 *
 * maxAge: 24 hours (cache expires after 24h)
 * buster: increment this to invalidate all cache on app update
 */
persistQueryClient({
  queryClient,
  persister: idbPersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: 'v1', // Increment to clear all cache (e.g., 'v2', 'v3')
});

/**
 * Utility function to invalidate all queries
 * Useful for logout or when data needs to be completely refreshed
 */
export const invalidateAllQueries = async () => {
  await queryClient.invalidateQueries();
  await idbPersister.removeClient();
  console.log('[QueryClient] All queries invalidated');
};

/**
 * Utility function to clear all cache and reset
 * Nuclear option - use sparingly
 */
export const clearAllCache = async () => {
  queryClient.clear();
  await idbPersister.removeClient();
  console.log('[QueryClient] All cache cleared');
};
