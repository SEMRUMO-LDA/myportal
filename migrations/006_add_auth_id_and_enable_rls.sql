-- Migration: Add auth_id column and enable RLS
-- Author: MyPortal Senior Team
-- Date: 2024-03-23
-- Critical: This migration enables Row Level Security to protect user data

-- ================================================
-- STEP 1: Add auth_id column to users table
-- ================================================

-- Add auth_id column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

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

            RAISE NOTICE 'Mapped user % to auth %', user_record.id, auth_user_id;
        ELSE
            RAISE WARNING 'No auth user found for % (%)', user_record.id, user_record.email;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the mapping
SELECT map_users_to_auth();

-- ================================================
-- STEP 3: Enable RLS on all tables
-- ================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on time_logs table
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on leaves table
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Enable RLS on anomalies table
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- Enable RLS on expenses table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on documents table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on messages table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ================================================
-- STEP 4: Create RLS Policies - Users Table
-- ================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

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

-- ================================================
-- STEP 6: Create RLS Policies - Leaves Table
-- ================================================

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

-- ================================================
-- STEP 7: Create RLS Policies - Anomalies Table
-- ================================================

DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can create own anomalies" ON anomalies;
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

-- ================================================
-- STEP 8: Create helper function for auth context
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
-- STEP 10: Verification queries
-- ================================================

-- Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'time_logs', 'leaves', 'anomalies')
ORDER BY tablename;

-- Check policies created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check users with missing auth_id
SELECT COUNT(*) as users_without_auth_id
FROM users
WHERE auth_id IS NULL;

-- ================================================
-- IMPORTANT NOTES:
-- ================================================
-- 1. Run this migration in a transaction
-- 2. Test thoroughly in staging first
-- 3. Have a rollback plan ready
-- 4. Monitor performance after enabling RLS
-- 5. Update application code to handle RLS errors

-- To rollback if needed:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;