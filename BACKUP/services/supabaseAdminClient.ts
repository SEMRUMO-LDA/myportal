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
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not found. Admin operations will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
