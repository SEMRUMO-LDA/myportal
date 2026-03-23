-- ============================================================================
-- PART 2: ADD RLS TO USERS AND TIME_LOGS TABLES
-- ============================================================================

BEGIN;

-- ============================================================================
-- USERS TABLE
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
-- TIME_LOGS TABLE
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

COMMIT;
