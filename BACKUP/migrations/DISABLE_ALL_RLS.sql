-- =====================================================
-- DISABLE RLS on ALL tables
-- Use this if RLS is causing problems
-- =====================================================

BEGIN;

-- Disable RLS on all tables
ALTER TABLE IF EXISTS anomalies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hour_bank_adjustments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can create own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can update own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Only admins can delete anomalies" ON anomalies;

DROP POLICY IF EXISTS "Users can view own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can create own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can update own time logs" ON time_logs;

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own pending expenses" ON expenses;

DROP POLICY IF EXISTS "Users can view own leaves" ON leaves;
DROP POLICY IF EXISTS "Users can request leaves" ON leaves;
DROP POLICY IF EXISTS "Users can update own pending leaves" ON leaves;

DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can create own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own pending trips" ON trips;

DROP POLICY IF EXISTS "Users can view own hour bank adjustments" ON hour_bank_adjustments;
DROP POLICY IF EXISTS "Only admins can create hour bank adjustments" ON hour_bank_adjustments;

COMMIT;

-- =====================================================
-- RLS DISABLED - App should work normally now
-- Security is handled at application level
-- =====================================================
