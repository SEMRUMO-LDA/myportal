/**
 * Supabase Admin Client
 *
 * SECURITY NOTE: This client uses the SERVICE_ROLE key which has elevated privileges.
 * It should ONLY be used for operations that require admin access, such as:
 * - Resetting user passwords
 * - Admin-only database operations
 *
 * In production, these operations should be moved to Supabase Edge Functions
 * to avoid exposing the service role key in the client.
 *
 * GRACEFUL DEGRADATION: If the service key is not available (which is correct
 * for frontend builds — it should NOT be in VITE_ variables), admin operations
 * will fail gracefully with a warning instead of crashing the app.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';

const SERVICE_KEY_AVAILABLE = !!supabaseServiceKey;

if (!SERVICE_KEY_AVAILABLE) {
  console.warn(
    '⚠️  SUPABASE_SERVICE_KEY not available in frontend (this is expected and correct for security).\n' +
    '   Admin operations (password reset, user management) will not work from the client.\n' +
    '   These should be handled via Supabase Edge Functions in production.'
  );
}

// Create client even without key — it won't be used for admin ops if key is missing
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || '',
  supabaseServiceKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Check if admin operations are available
 * Components should check this before attempting admin operations
 */
export const isAdminClientAvailable = (): boolean => SERVICE_KEY_AVAILABLE;
