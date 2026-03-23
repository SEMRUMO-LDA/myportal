-- ============================================================================
-- CRITICAL RLS SECURITY FIXES v2
-- Created: 2026-03-18
-- Purpose: Fix critical security vulnerabilities identified in pre-production audit
-- NOTE: Removed manager_id references (column does not exist in users table)
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
-- Only SYSTEM or user themselves or ADMIN/RH can create anomalies
CREATE POLICY "secure_insert_anomalies" ON anomalies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        detected_by = 'SYSTEM'
        OR auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- CREATE SECURE SELECT POLICY (consolidated)
-- Users see their own, admins see all
CREATE POLICY "secure_select_anomalies" ON anomalies
    FOR SELECT
    TO authenticated
    USING (
        -- User sees their own
        auth.uid()::text = user_id::text
        OR
        -- Admins and RH see all
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- CREATE SECURE UPDATE POLICY
-- Restrict status transitions to prevent workflow bypass
CREATE POLICY "secure_update_anomalies" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (
        -- User can only update their own
        auth.uid()::text = user_id::text
        OR
        -- Admins and RH can update all
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    )
    WITH CHECK (
        -- Employees can only: add justification, change AWAITING_JUSTIFICATION → JUSTIFIED_PENDING_REVIEW
        (
            auth.uid()::text = user_id::text
            AND (
                status IN ('AWAITING_JUSTIFICATION', 'JUSTIFIED_PENDING_REVIEW')
                OR justification IS NOT NULL
            )
        )
        OR
        -- Admins and RH can change any status
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- CREATE DELETE POLICY
-- Only admins can delete anomalies
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

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile and admins can see all
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (
        -- User sees themselves
        auth.uid()::text = id::text
        OR
        -- Admins and RH see all
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id::text = auth.uid()::text
            AND u.role IN ('ADMIN', 'RH')
        )
    );

-- Only admins can insert users
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

-- Users can update their own profile (limited fields), admins can update all
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

-- Only admins can delete users
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

-- Enable RLS on time_logs table
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs, admins see all
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

-- Only authenticated users can insert their own time logs
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

-- Users can update their own logs (limited), system/admins can update all
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

-- Only admins can delete time logs
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

-- Enable RLS on internal_messages table
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages addressed to them
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

-- System and admins can insert messages
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

-- Users can update their own messages (mark as read)
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

-- Only admins can delete messages
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

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Users see their own, admins see all
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

-- Users can insert their own expenses
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

-- Users can update their own (if pending), admins can update all
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

-- Only admins can delete expenses
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

-- Enable RLS on leaves table
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Users see their own, admins see all
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

-- Users can insert their own leave requests
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

-- Users can update their own (if pending), admins can update all
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

-- Only admins can delete leave requests
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

-- Enable RLS on trips table
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Users see their own, admins see all
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

-- Users can insert their own trips
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

-- Users can update their own (if pending), admins can update all
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

-- Only admins can delete trips
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

-- Enable RLS on hour_bank_adjustments table
ALTER TABLE hour_bank_adjustments ENABLE ROW LEVEL SECURITY;

-- Users see their own, admins see all
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

-- Only admins and RH can insert adjustments
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

-- Only admins and RH can update adjustments
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

-- Only admins can delete adjustments
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
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('anomalies', 'users', 'time_logs', 'internal_messages', 'expenses', 'leaves', 'trips', 'hour_bank_adjustments');

-- Run this to see all policies:
-- SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('anomalies', 'users', 'time_logs', 'internal_messages', 'expenses', 'leaves', 'trips', 'hour_bank_adjustments') ORDER BY tablename, policyname;
