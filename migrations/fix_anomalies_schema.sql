-- ============================================
-- Migration: Fix Anomalies Table Schema and RLS
-- Date: 2026-03-18
-- Purpose: Fix anomaly creation issues
-- ============================================

-- Step 1: Check current table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'anomalies'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if needed
-- Check if 'minutes' column exists (if the app expects it)
DO $$
BEGIN
    -- Add 'minutes' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'anomalies' AND column_name = 'minutes') THEN
        ALTER TABLE anomalies ADD COLUMN minutes INTEGER;
        COMMENT ON COLUMN anomalies.minutes IS 'Number of minutes for time-based anomalies (delays, early exits, etc)';
    END IF;

    -- Ensure metadata column exists for additional data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'anomalies' AND column_name = 'metadata') THEN
        ALTER TABLE anomalies ADD COLUMN metadata JSONB DEFAULT '{}';
        COMMENT ON COLUMN anomalies.metadata IS 'Additional flexible data for anomalies';
    END IF;

    -- Ensure all required columns have proper defaults
    -- Date should default to today if not provided
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'anomalies'
                   AND column_name = 'date'
                   AND column_default IS NOT NULL) THEN
        ALTER TABLE anomalies ALTER COLUMN date SET DEFAULT CURRENT_DATE;
    END IF;

    -- Detected_at should default to now if not provided
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'anomalies'
                   AND column_name = 'detected_at'
                   AND column_default IS NOT NULL) THEN
        ALTER TABLE anomalies ALTER COLUMN detected_at SET DEFAULT NOW();
    END IF;

    -- Detected_by should default to 'SYSTEM' if not provided
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'anomalies'
                   AND column_name = 'detected_by'
                   AND column_default IS NOT NULL) THEN
        ALTER TABLE anomalies ALTER COLUMN detected_by SET DEFAULT 'SYSTEM';
    END IF;
END $$;

-- Step 3: Fix Row Level Security (RLS) Policies
-- First, check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'anomalies';

-- Enable RLS if not already enabled
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies (if any)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON anomalies;
DROP POLICY IF EXISTS "Enable read for users" ON anomalies;
DROP POLICY IF EXISTS "Enable update for managers" ON anomalies;
DROP POLICY IF EXISTS "Enable all for service role" ON anomalies;

-- Create new comprehensive policies

-- 1. Service role has full access (for backend operations)
CREATE POLICY "Service role full access" ON anomalies
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Authenticated users can INSERT anomalies (for system to create them)
CREATE POLICY "Authenticated users can insert" ON anomalies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. Users can view their own anomalies
CREATE POLICY "Users can view own anomalies" ON anomalies
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH', 'MANAGER')
        )
    );

-- 4. Users can update their own anomalies (for justifications)
CREATE POLICY "Users can update own anomalies" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- 5. Admins and RH can view all anomalies
CREATE POLICY "Admins and RH can view all" ON anomalies
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- 6. Admins and RH can update any anomaly
CREATE POLICY "Admins and RH can update all" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_anomalies_user_id ON anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_date ON anomalies(date);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(type);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_time_log_id ON anomalies(time_log_id);

-- Step 5: Verify the fixes
-- Check if we can insert a test anomaly
DO $$
DECLARE
    test_user_id INTEGER;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM users LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Try to insert a test anomaly
        INSERT INTO anomalies (
            user_id,
            type,
            date,
            description,
            severity,
            status,
            detected_at,
            detected_by,
            minutes,
            metadata
        ) VALUES (
            test_user_id,
            'TEST',
            CURRENT_DATE,
            'Test anomaly - can be deleted',
            'LOW',
            'RESOLVED',
            NOW(),
            'MIGRATION_TEST',
            0,
            '{"test": true}'::jsonb
        );

        RAISE NOTICE 'Test anomaly created successfully. Cleaning up...';

        -- Clean up test data
        DELETE FROM anomalies
        WHERE detected_by = 'MIGRATION_TEST'
        AND metadata->>'test' = 'true';

        RAISE NOTICE 'Test completed successfully!';
    ELSE
        RAISE WARNING 'No users found in database to test with';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Test failed: %', SQLERRM;
END $$;

-- Step 6: Display current anomalies count
SELECT
    COUNT(*) as total_anomalies,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'AWAITING_JUSTIFICATION' THEN 1 END) as awaiting_justification,
    COUNT(CASE WHEN status = 'JUSTIFIED_PENDING_REVIEW' THEN 1 END) as justified_pending_review,
    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved,
    COUNT(CASE WHEN date = CURRENT_DATE THEN 1 END) as today_anomalies
FROM anomalies;

-- Step 7: Show sample of recent anomalies (if any exist)
SELECT
    a.id,
    a.user_id,
    u.name as user_name,
    a.type,
    a.description,
    a.severity,
    a.status,
    a.date,
    a.detected_at
FROM anomalies a
LEFT JOIN users u ON u.id = a.user_id
ORDER BY a.detected_at DESC
LIMIT 10;