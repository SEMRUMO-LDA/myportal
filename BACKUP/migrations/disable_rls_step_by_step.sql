-- ============================================================================
-- EMERGENCY RLS DISABLE - EXECUTE ONE LINE AT A TIME
-- ============================================================================
-- Copy and paste each ALTER TABLE command separately
-- Wait for success before running the next one
-- ============================================================================

-- STEP 1: Disable RLS on anomalies
ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;

-- STEP 2: Disable RLS on users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- STEP 3: Disable RLS on time_logs
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;

-- STEP 4: Disable RLS on internal_messages
ALTER TABLE internal_messages DISABLE ROW LEVEL SECURITY;

-- STEP 5: Disable RLS on expenses
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- STEP 6: Disable RLS on leaves
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;

-- STEP 7: Disable RLS on trips
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;

-- STEP 8: Disable RLS on hour_bank_adjustments
ALTER TABLE hour_bank_adjustments DISABLE ROW LEVEL SECURITY;
