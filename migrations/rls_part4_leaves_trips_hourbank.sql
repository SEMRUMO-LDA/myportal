-- ============================================================================
-- PART 4: ADD RLS TO LEAVES, TRIPS, AND HOUR_BANK_ADJUSTMENTS TABLES
-- ============================================================================

BEGIN;

-- ============================================================================
-- LEAVES TABLE
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
-- TRIPS TABLE
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
-- HOUR_BANK_ADJUSTMENTS TABLE
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
