-- =====================================================
-- Migration: Create auth_user_id() Helper Function
-- Purpose: Map auth.uid() UUID to users.id BigInt for RLS policies
-- =====================================================

BEGIN;

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS auth_user_id() CASCADE;

-- Create helper function to get numeric user ID from auth UUID
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION auth_user_id() IS
'Maps Supabase Auth UUID (auth.uid()) to numeric user ID (users.id) for RLS policies. Returns NULL if no mapping exists.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth_user_id() TO anon;

COMMIT;

-- =====================================================
-- USAGE EXAMPLE:
-- =====================================================
-- Instead of: WHERE user_id = auth.uid()::bigint  (WRONG - type mismatch)
-- Use:        WHERE user_id = auth_user_id()      (CORRECT)
--
-- Example RLS Policy:
-- CREATE POLICY "Users can view own time logs"
-- ON time_logs FOR SELECT
-- TO authenticated
-- USING (user_id = auth_user_id());
-- =====================================================
