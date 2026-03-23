-- ============================================================================
-- PART 1: FIX ANOMALIES TABLE RLS POLICIES
-- ============================================================================

BEGIN;

-- Drop all existing policies on anomalies table
DROP POLICY IF EXISTS "Authenticated users can insert" ON anomalies;
DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Managers can view team anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can view all anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can update own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Managers can update team anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can update all anomalies" ON anomalies;

-- CREATE SECURE INSERT POLICY
-- Only admins/RH can manually create anomalies (system creates them via service role)
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
            AND (
                status IN ('AWAITING_JUSTIFICATION', 'JUSTIFIED_PENDING_REVIEW')
                OR employee_justification IS NOT NULL
            )
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

COMMIT;
