-- Migration: Add auth_id column and enable RLS (SAFE VERSION)
-- Author: MyPortal Senior Team
-- Date: 2024-03-23
-- Critical: This migration enables Row Level Security to protect user data
-- This version checks for table existence and handles errors gracefully

BEGIN; -- Start transaction

-- ================================================
-- STEP 1: Add auth_id column to users table
-- ================================================

-- Add auth_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'auth_id'
    ) THEN
        ALTER TABLE users ADD COLUMN auth_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added auth_id column to users table';
    ELSE
        RAISE NOTICE 'auth_id column already exists';
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- ================================================
-- STEP 2: Map existing users to auth.users
-- ================================================

-- This function safely maps users to their auth records
CREATE OR REPLACE FUNCTION map_users_to_auth()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    auth_user_id UUID;
    mapped_count INTEGER := 0;
    not_found_count INTEGER := 0;
BEGIN
    -- Loop through all users without auth_id
    FOR user_record IN
        SELECT id, email, name
        FROM users
        WHERE auth_id IS NULL
        AND email IS NOT NULL
    LOOP
        -- Check if auth user exists
        SELECT id INTO auth_user_id
        FROM auth.users
        WHERE email = LOWER(user_record.email)
        LIMIT 1;

        -- Update if found
        IF auth_user_id IS NOT NULL THEN
            UPDATE users
            SET auth_id = auth_user_id
            WHERE id = user_record.id;

            mapped_count := mapped_count + 1;
            RAISE NOTICE 'Mapped user % (%) to auth %', user_record.id, user_record.email, auth_user_id;
        ELSE
            not_found_count := not_found_count + 1;
            RAISE WARNING 'No auth user found for % (%)', user_record.id, user_record.email;
        END IF;
    END LOOP;

    RAISE NOTICE 'Mapping complete: % users mapped, % not found', mapped_count, not_found_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the mapping
SELECT map_users_to_auth();

-- ================================================
-- STEP 3: Enable RLS on existing tables
-- ================================================

-- Function to safely enable RLS on a table
CREATE OR REPLACE FUNCTION enable_rls_if_exists(target_table TEXT)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_name = target_table
    ) THEN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
        RAISE NOTICE 'RLS enabled on table: %', target_table;
    ELSE
        RAISE NOTICE 'Table % does not exist, skipping RLS', target_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all relevant tables
SELECT enable_rls_if_exists('users');
SELECT enable_rls_if_exists('time_logs');
SELECT enable_rls_if_exists('leaves');
SELECT enable_rls_if_exists('anomalies');
SELECT enable_rls_if_exists('expenses');
SELECT enable_rls_if_exists('documents');
SELECT enable_rls_if_exists('messages');

-- Drop the helper function
DROP FUNCTION IF EXISTS enable_rls_if_exists(TEXT);

-- ================================================
-- STEP 4: Create RLS Policies - Users Table
-- ================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Managers can view department users" ON users;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT
    USING (auth_id = auth.uid());

-- Users can update specific fields of their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Admins/HR can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('ADMIN', 'Administrador', 'RH', 'Diretor de Unidade')
        )
    );

-- Admins/HR can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.role IN ('ADMIN', 'Administrador', 'RH')
        )
    );

-- Department managers can view their department users
CREATE POLICY "Managers can view department users" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users manager
            WHERE manager.auth_id = auth.uid()
            AND manager.role = 'Responsável de Departamento'
            AND manager.department = users.department
        )
    );

-- ================================================
-- STEP 5: Create RLS Policies - Time Logs Table
-- ================================================

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_logs') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own time logs" ON time_logs;
        DROP POLICY IF EXISTS "Users can create own time logs" ON time_logs;
        DROP POLICY IF EXISTS "Admins can view all time logs" ON time_logs;
        DROP POLICY IF EXISTS "Managers can view department time logs" ON time_logs;

        -- Users can view their own time logs
        CREATE POLICY "Users can view own time logs" ON time_logs
            FOR SELECT
            USING (
                user_id IN (
                    SELECT id FROM users WHERE auth_id = auth.uid()
                )
            );

        -- Users can create their own time logs
        CREATE POLICY "Users can create own time logs" ON time_logs
            FOR INSERT
            WITH CHECK (
                user_id IN (
                    SELECT id FROM users WHERE auth_id = auth.uid()
                )
            );

        -- Admins can view all time logs
        CREATE POLICY "Admins can view all time logs" ON time_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.auth_id = auth.uid()
                    AND u.role IN ('ADMIN', 'Administrador', 'RH', 'Diretor de Unidade')
                )
            );

        -- Managers can view their department's time logs
        CREATE POLICY "Managers can view department time logs" ON time_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users manager
                    JOIN users employee ON employee.department = manager.department
                    WHERE manager.auth_id = auth.uid()
                    AND manager.role = 'Responsável de Departamento'
                    AND employee.id = time_logs.user_id
                )
            );

        RAISE NOTICE 'Created RLS policies for time_logs table';
    END IF;
END $$;

-- ================================================
-- STEP 6: Create RLS Policies - Leaves Table
-- ================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaves') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own leaves" ON leaves;
        DROP POLICY IF EXISTS "Users can create own leaves" ON leaves;
        DROP POLICY IF EXISTS "Admins can manage all leaves" ON leaves;
        DROP POLICY IF EXISTS "Managers can manage department leaves" ON leaves;

        -- Users can view their own leaves
        CREATE POLICY "Users can view own leaves" ON leaves
            FOR SELECT
            USING (
                user_id IN (
                    SELECT id FROM users WHERE auth_id = auth.uid()
                )
            );

        -- Users can create their own leave requests
        CREATE POLICY "Users can create own leaves" ON leaves
            FOR INSERT
            WITH CHECK (
                user_id IN (
                    SELECT id FROM users WHERE auth_id = auth.uid()
                )
            );

        -- Admins/HR can manage all leaves
        CREATE POLICY "Admins can manage all leaves" ON leaves
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.auth_id = auth.uid()
                    AND u.role IN ('ADMIN', 'Administrador', 'RH')
                )
            );

        -- Managers can manage their department's leaves
        CREATE POLICY "Managers can manage department leaves" ON leaves
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users manager
                    JOIN users employee ON employee.department = manager.department
                    WHERE manager.auth_id = auth.uid()
                    AND manager.role = 'Responsável de Departamento'
                    AND employee.id = leaves.user_id
                )
            );

        RAISE NOTICE 'Created RLS policies for leaves table';
    END IF;
END $$;

-- ================================================
-- STEP 7: Create RLS Policies - Anomalies Table
-- ================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anomalies') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
        DROP POLICY IF EXISTS "Users can create own anomalies" ON anomalies;
        DROP POLICY IF EXISTS "Users can update own pending anomalies" ON anomalies;
        DROP POLICY IF EXISTS "Admins can manage all anomalies" ON anomalies;

        -- Users can view their own anomalies
        CREATE POLICY "Users can view own anomalies" ON anomalies
            FOR SELECT
            USING (
                user_id IN (
                    SELECT id FROM users WHERE auth_id = auth.uid()
                )
            );

        -- Users can create anomaly requests for themselves
        CREATE POLICY "Users can create own anomalies" ON anomalies
            FOR INSERT
            WITH CHECK (
                user_id IN (
                    SELECT id FROM users WHERE auth_id = auth.uid()
                )
            );

        -- Users can update their pending anomalies
        CREATE POLICY "Users can update own pending anomalies" ON anomalies
            FOR UPDATE
            USING (
                user_id IN (
                    SELECT id FROM users WHERE auth_id = auth.uid()
                )
                AND status = 'PENDING'
            );

        -- Admins/HR can manage all anomalies
        CREATE POLICY "Admins can manage all anomalies" ON anomalies
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.auth_id = auth.uid()
                    AND u.role IN ('ADMIN', 'Administrador', 'RH', 'Diretor de Unidade')
                )
            );

        RAISE NOTICE 'Created RLS policies for anomalies table';
    END IF;
END $$;

-- ================================================
-- STEP 8: Create helper functions for auth context
-- ================================================

-- This function helps get current user data efficiently
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
    SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_department()
RETURNS TEXT AS $$
    SELECT department FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ================================================
-- STEP 9: Grant necessary permissions
-- ================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant select on auth.users for mapping
GRANT SELECT ON auth.users TO authenticated;

-- ================================================
-- STEP 10: Final verification
-- ================================================

-- Check RLS status
DO $$
DECLARE
    rls_enabled_count INTEGER;
    total_tables INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'time_logs', 'leaves', 'anomalies')
    AND rowsecurity = true;

    SELECT COUNT(*) INTO total_tables
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'time_logs', 'leaves', 'anomalies');

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RLS Migration Summary:';
    RAISE NOTICE 'RLS enabled on % out of % core tables', rls_enabled_count, total_tables;

    -- Check users with auth_id
    SELECT COUNT(*) INTO total_tables FROM users WHERE auth_id IS NOT NULL;
    SELECT COUNT(*) INTO rls_enabled_count FROM users;
    RAISE NOTICE 'Users with auth_id: % out of %', total_tables, rls_enabled_count;

    -- Count policies
    SELECT COUNT(*) INTO total_tables FROM pg_policies WHERE schemaname = 'public';
    RAISE NOTICE 'Total RLS policies created: %', total_tables;
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';

    IF rls_enabled_count < 4 THEN
        RAISE WARNING 'Not all core tables have RLS enabled!';
    END IF;
END $$;

COMMIT; -- Commit transaction

-- ================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ================================================

-- Run these queries after migration to verify success:

-- 1. Check RLS status on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity,
    CASE
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'time_logs', 'leaves', 'anomalies')
ORDER BY tablename;

-- 2. Check policies created
SELECT
    tablename,
    policyname,
    cmd as operation,
    CASE permissive
        WHEN 'PERMISSIVE' THEN '✅ Allow'
        ELSE '🚫 Deny'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check users mapping status
SELECT
    COUNT(*) FILTER (WHERE auth_id IS NOT NULL) as users_with_auth_id,
    COUNT(*) FILTER (WHERE auth_id IS NULL) as users_without_auth_id,
    COUNT(*) as total_users,
    ROUND(COUNT(*) FILTER (WHERE auth_id IS NOT NULL) * 100.0 / COUNT(*), 2) as mapping_percentage
FROM users;

-- ================================================
-- ROLLBACK INSTRUCTIONS (Emergency Only)
-- ================================================
-- If you need to rollback, run this in a transaction:
/*
BEGIN;

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Managers can view department users" ON users;

DROP POLICY IF EXISTS "Users can view own time logs" ON time_logs;
DROP POLICY IF EXISTS "Users can create own time logs" ON time_logs;
DROP POLICY IF EXISTS "Admins can view all time logs" ON time_logs;
DROP POLICY IF EXISTS "Managers can view department time logs" ON time_logs;

DROP POLICY IF EXISTS "Users can view own leaves" ON leaves;
DROP POLICY IF EXISTS "Users can create own leaves" ON leaves;
DROP POLICY IF EXISTS "Admins can manage all leaves" ON leaves;
DROP POLICY IF EXISTS "Managers can manage department leaves" ON leaves;

DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can create own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can update own pending anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins can manage all anomalies" ON anomalies;

-- Note: We keep the auth_id column for future use

COMMIT;
*/