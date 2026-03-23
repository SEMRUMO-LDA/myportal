-- ============================================================================
-- EMERGENCY: DISABLE RLS TO RESTORE APP
-- ============================================================================
-- This will restore app functionality immediately
-- We need to fix the auth mapping before re-enabling RLS
-- ============================================================================

BEGIN;

-- Disable RLS on all tables to restore app
ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE hour_bank_adjustments DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- REASON FOR FAILURE:
-- ============================================================================
-- The RLS policies use auth.uid() which returns the Supabase Auth UUID
-- But the app uses numeric user IDs (id::text)
-- There's no mapping between auth.uid() and users.id
--
-- TO FIX PROPERLY, WE NEED TO:
-- 1. Add auth_id column to users table
-- 2. Map Supabase auth users to app users
-- 3. Update policies to use proper auth mapping
-- ============================================================================
