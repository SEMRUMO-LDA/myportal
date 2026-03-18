-- ============================================================================
-- PART 3: ADD RLS TO INTERNAL_MESSAGES AND EXPENSES TABLES
-- ============================================================================

BEGIN;

-- ============================================================================
-- INTERNAL_MESSAGES TABLE
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
-- EXPENSES TABLE
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

COMMIT;
