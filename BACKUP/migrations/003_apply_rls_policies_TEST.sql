-- TEST: Apply RLS only to ANOMALIES table to find the error

BEGIN;

-- =====================================================
-- 1. ANOMALIES TABLE - Fix 5 Critical Vulnerabilities
-- =====================================================

-- Enable RLS on anomalies table
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "anomalies_select_policy" ON anomalies;
DROP POLICY IF EXISTS "anomalies_insert_policy" ON anomalies;
DROP POLICY IF EXISTS "anomalies_update_policy" ON anomalies;
DROP POLICY IF EXISTS "anomalies_delete_policy" ON anomalies;

-- Policy 1: SELECT - Users can view their own anomalies + Admins/Auditors can view all
CREATE POLICY "Users can view own anomalies"
ON anomalies FOR SELECT
TO authenticated
USING (
  user_id = auth_user_id() OR
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth_user_id()
    AND role IN ('ADMIN', 'Administrador', 'AUDITOR', 'Auditor')
  )
);

COMMIT;
