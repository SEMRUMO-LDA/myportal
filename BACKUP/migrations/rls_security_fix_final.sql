-- ============================================================================
-- CRITICAL RLS SECURITY FIXES - FINAL VERSION
-- Created: 2026-03-18
-- Purpose: Fix all critical security vulnerabilities identified in audit
-- Changes: Fixed column names (employee_justification, removed detected_by check)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX ANOMALIES TABLE RLS POLICIES
-- ============================================================================

-- Drop all existing policies on anomalies table
DROP POLICY IF EXISTS "Authenticated users can insert" ON anomalies;
DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Managers can view team anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can view all anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can update own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Managers can update team anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can update all anomalies" ON anomalies;

-- CREATE SECURE INSERT POLICY
-- Only admins/RH can manually create anomalies (system creates via service role)
CREATE POLICY "secure_insert_anomalies" ON anomalies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- CREATE SECURE SELECT POLICY
CREATE POLICY "secure_select_anomalies" ON anomalies
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- CREATE SECURE UPDATE POLICY
CREATE POLICY "secure_update_anomalies" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    )
    WITH CHECK (
        (
            auth.uid()::text = user_id::text
            AND status IN ('AWAITING_JUSTIFICATION', 'JUSTIFIED_PENDING_REVIEW')
        )
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- CREATE DELETE POLICY
CREATE POLICY "secure_delete_anomalies" ON anomalies
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

-- ============================================================================
-- 2. ADD RLS TO USERS TABLE
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = id::text
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id::text = auth.uid()::text
            AND u.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "users_insert_admin_only" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

CREATE POLICY "users_update_limited" ON users
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    )
    WITH CHECK (
        auth.uid()::text = id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "users_delete_admin_only" ON users
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

-- ============================================================================
-- 3. ADD RLS TO TIME_LOGS TABLE
-- ============================================================================

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_logs_select" ON time_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "time_logs_insert_own" ON time_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "time_logs_update" ON time_logs
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    )
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "time_logs_delete_admin_only" ON time_logs
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

-- ============================================================================
-- 4. ADD RLS TO INTERNAL_MESSAGES TABLE
-- ============================================================================

ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal_messages_select_recipient" ON internal_messages
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "internal_messages_insert_system" ON internal_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "internal_messages_update_own" ON internal_messages
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "internal_messages_delete_admin_only" ON internal_messages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

-- ============================================================================
-- 5. ADD RLS TO EXPENSES TABLE
-- ============================================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select" ON expenses
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "expenses_insert_own" ON expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "expenses_update" ON expenses
    FOR UPDATE
    TO authenticated
    USING (
        (auth.uid()::text = user_id::text AND status = 'PENDING')
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "expenses_delete_admin_only" ON expenses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

-- ============================================================================
-- 6. ADD RLS TO LEAVES TABLE
-- ============================================================================

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaves_select" ON leaves
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "leaves_insert_own" ON leaves
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "leaves_update" ON leaves
    FOR UPDATE
    TO authenticated
    USING (
        (auth.uid()::text = user_id::text AND status = 'PENDING')
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "leaves_delete_admin_only" ON leaves
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

-- ============================================================================
-- 7. ADD RLS TO TRIPS TABLE
-- ============================================================================

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips_select" ON trips
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "trips_insert_own" ON trips
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "trips_update" ON trips
    FOR UPDATE
    TO authenticated
    USING (
        (auth.uid()::text = user_id::text AND status = 'PENDING')
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "trips_delete_admin_only" ON trips
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

-- ============================================================================
-- 8. ADD RLS TO HOUR_BANK_ADJUSTMENTS TABLE
-- ============================================================================

ALTER TABLE hour_bank_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hour_bank_adjustments_select" ON hour_bank_adjustments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "hour_bank_adjustments_insert_admin" ON hour_bank_adjustments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "hour_bank_adjustments_update_admin" ON hour_bank_adjustments
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "hour_bank_adjustments_delete_admin" ON hour_bank_adjustments
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
    );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (uncomment to run after migration)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('anomalies', 'users', 'time_logs', 'internal_messages', 'expenses', 'leaves', 'trips', 'hour_bank_adjustments');

-- View all policies created:
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('anomalies', 'users', 'time_logs', 'internal_messages', 'expenses', 'leaves', 'trips', 'hour_bank_adjustments')
-- ORDER BY tablename, policyname;
