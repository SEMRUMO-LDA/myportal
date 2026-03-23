-- ============================================================================
-- CRITICAL RLS SECURITY FIXES - QUICK VERSION (No EXISTS queries)
-- Created: 2026-03-18
-- Purpose: Fast execution without timeout - simplified policies
-- Note: Uses simpler checks to avoid timeout issues
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX ANOMALIES TABLE - Drop old policies only
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert" ON anomalies;
DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Managers can view team anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can view all anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can update own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Managers can update team anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can update all anomalies" ON anomalies;

-- Simplified INSERT - users can only insert their own
CREATE POLICY "secure_insert_anomalies" ON anomalies
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

-- Simplified SELECT - users see their own only
CREATE POLICY "secure_select_anomalies" ON anomalies
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

-- Simplified UPDATE - users can update their own with status restrictions
CREATE POLICY "secure_update_anomalies" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (
        auth.uid()::text = user_id::text
        AND status IN ('AWAITING_JUSTIFICATION', 'JUSTIFIED_PENDING_REVIEW')
    );

-- No DELETE policy - prevents accidental deletion

COMMIT;

-- ============================================================================
-- 2. ENABLE RLS ON CRITICAL TABLES (separate transaction)
-- ============================================================================

BEGIN;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_bank_adjustments ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- 3. USERS TABLE - Simple policies
-- ============================================================================

BEGIN;

-- Users see only themselves
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = id::text);

-- Users can update themselves
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- No INSERT/DELETE for regular users

COMMIT;

-- ============================================================================
-- 4. TIME_LOGS TABLE - Simple policies
-- ============================================================================

BEGIN;

CREATE POLICY "time_logs_select" ON time_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "time_logs_insert_own" ON time_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "time_logs_update" ON time_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

COMMIT;

-- ============================================================================
-- 5. INTERNAL_MESSAGES TABLE - Simple policies
-- ============================================================================

BEGIN;

CREATE POLICY "internal_messages_select_recipient" ON internal_messages
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "internal_messages_update_own" ON internal_messages
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text);

COMMIT;

-- ============================================================================
-- 6. EXPENSES TABLE - Simple policies
-- ============================================================================

BEGIN;

CREATE POLICY "expenses_select" ON expenses
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "expenses_insert_own" ON expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "expenses_update" ON expenses
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text AND status = 'PENDING');

COMMIT;

-- ============================================================================
-- 7. LEAVES TABLE - Simple policies
-- ============================================================================

BEGIN;

CREATE POLICY "leaves_select" ON leaves
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "leaves_insert_own" ON leaves
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "leaves_update" ON leaves
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text AND status = 'PENDING');

COMMIT;

-- ============================================================================
-- 8. TRIPS TABLE - Simple policies
-- ============================================================================

BEGIN;

CREATE POLICY "trips_select" ON trips
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "trips_insert_own" ON trips
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "trips_update" ON trips
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text AND status = 'PENDING');

COMMIT;

-- ============================================================================
-- 9. HOUR_BANK_ADJUSTMENTS TABLE - Simple policies
-- ============================================================================

BEGIN;

CREATE POLICY "hour_bank_adjustments_select" ON hour_bank_adjustments
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

-- No INSERT/UPDATE/DELETE for regular users (admin only via service role)

COMMIT;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This is a SIMPLIFIED version to avoid timeout
-- Admin/RH access is handled via SERVICE ROLE (not checked in policies)
-- To give admins access, they need to use the service role key
-- Regular users can only see/edit their own data
-- This is SECURE but less flexible - admins need backend access
-- ============================================================================
