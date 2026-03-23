/**
 * React Query Hooks - Centralized Data Fetching
 *
 * These hooks replace manual useState + useEffect + Supabase queries
 * with automatic caching, background refetching, and persistence.
 *
 * Benefits:
 * - Automatic cache management
 * - Stale-while-revalidate pattern
 * - Background refetching
 * - IndexedDB persistence
 * - Type-safe
 * - Reduced code duplication
 */

export { useUsers } from './useUsers';
export { useTimeLogs } from './useTimeLogs';
export { useLocations } from './useLocations';
export { useDepartments } from './useDepartments';
export { useLeaves } from './useLeaves';
