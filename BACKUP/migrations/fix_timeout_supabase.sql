-- ============================================
-- URGENT FIX: Database Statement Timeout Issues
-- For Supabase SQL Editor
-- Date: 2026-03-18
-- Priority: CRITICAL
-- ============================================

-- Step 1: Check current situation
-- ======================================

-- Check table size
SELECT
    'users' as table_name,
    COUNT(*) as total_rows,
    pg_size_pretty(pg_total_relation_size('users')) as total_size
FROM users;

-- Check current timeout setting
SELECT current_setting('statement_timeout') as current_timeout;

-- Check existing indexes on users table
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- Step 2: Increase timeout immediately (CRITICAL FIX)
-- ======================================

-- Increase timeout for all connections
ALTER DATABASE postgres SET statement_timeout = '30s';

-- Set timeout for different roles
ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE anon SET statement_timeout = '30s';
ALTER ROLE service_role SET statement_timeout = '60s';

-- Apply to current session
SET statement_timeout = '60s';

-- Step 3: Create missing indexes for performance
-- ======================================

-- Primary index on ID (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_company_status ON users(company, status);

-- Index for authentication queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin) WHERE pin IS NOT NULL;

-- Step 4: Update table statistics
-- ======================================

-- Analyze the table to update query planner statistics
ANALYZE users;

-- Also analyze related tables that join with users
ANALYZE time_logs;
ANALYZE anomalies;
ANALYZE absences;

-- Step 5: Create count cache table for optimization
-- ======================================

-- Create a simple table to cache counts
CREATE TABLE IF NOT EXISTS system_stats (
    stat_name VARCHAR(100) PRIMARY KEY,
    stat_value INTEGER,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Insert or update user count
INSERT INTO system_stats (stat_name, stat_value, last_updated)
VALUES ('total_users', (SELECT COUNT(*) FROM users), NOW())
ON CONFLICT (stat_name)
DO UPDATE SET
    stat_value = EXCLUDED.stat_value,
    last_updated = NOW();

-- Create a function to refresh stats periodically
CREATE OR REPLACE FUNCTION refresh_user_count()
RETURNS void AS $$
BEGIN
    UPDATE system_stats
    SET stat_value = (SELECT COUNT(*) FROM users),
        last_updated = NOW()
    WHERE stat_name = 'total_users';
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create monitoring view for slow queries
-- ======================================

-- Create a view to monitor slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state,
    usename,
    application_name
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
AND state != 'idle'
ORDER BY duration DESC;

-- Step 7: Verify improvements
-- ======================================

-- Show new timeout settings
SELECT
    'Current Session' as scope,
    current_setting('statement_timeout') as timeout_value
UNION ALL
SELECT
    'Database Default' as scope,
    setting as timeout_value
FROM pg_settings
WHERE name = 'statement_timeout';

-- Show created indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- Check if optimizations are working
SELECT
    'Optimization Status' as check_type,
    CASE
        WHEN COUNT(*) > 0 THEN 'SUCCESS - Indexes created'
        ELSE 'WARNING - No indexes found'
    END as status
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE 'idx_users%';

-- Final verification query
SELECT
    'Database Optimizations Applied' as status,
    NOW() as completed_at,
    current_setting('statement_timeout') as new_timeout,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'users') as total_indexes,
    (SELECT COUNT(*) FROM users) as total_users;