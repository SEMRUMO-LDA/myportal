-- ============================================
-- URGENT FIX: Database Statement Timeout Issues
-- Date: 2026-03-18
-- Priority: CRITICAL
-- ============================================

-- Step 1: Check current situation
\echo '======================================'
\echo 'STEP 1: Analyzing Current Situation'
\echo '======================================'

-- Check table size
SELECT
    'users' as table_name,
    COUNT(*) as total_rows,
    pg_size_pretty(pg_total_relation_size('users')) as total_size
FROM users;

-- Check current timeout setting
SHOW statement_timeout;

-- Check existing indexes on users table
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- Step 2: Increase timeout immediately (temporary fix)
\echo ''
\echo '======================================'
\echo 'STEP 2: Increasing Timeout (Immediate Fix)'
\echo '======================================'

-- Increase timeout for current session
SET statement_timeout = '60s';

-- Increase timeout for all new connections to this database
ALTER DATABASE postgres SET statement_timeout = '30s';

-- For Supabase projects, also set for authenticated and anon roles
ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE anon SET statement_timeout = '30s';
ALTER ROLE service_role SET statement_timeout = '60s';

\echo 'Timeout increased to 30s for regular users, 60s for service role'

-- Step 3: Create missing indexes
\echo ''
\echo '======================================'
\echo 'STEP 3: Creating Optimized Indexes'
\echo '======================================'

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

\echo 'Indexes created successfully'

-- Step 4: Update table statistics
\echo ''
\echo '======================================'
\echo 'STEP 4: Updating Table Statistics'
\echo '======================================'

-- Analyze the table to update query planner statistics
ANALYZE users;

-- Also analyze related tables that join with users
ANALYZE time_logs;
ANALYZE anomalies;
ANALYZE absences;

\echo 'Table statistics updated'

-- Step 5: Optimize the specific problematic query
\echo ''
\echo '======================================'
\echo 'STEP 5: Testing Optimized Query Performance'
\echo '======================================'

-- Test the problematic query with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
WITH pgrst_source AS (
  SELECT "public"."users".* FROM "public"."users"
  ORDER BY "public"."users"."id" ASC
  LIMIT 20 OFFSET 0
)
SELECT
  null::bigint AS total_result_set,
  pg_catalog.count(_postgrest_t) AS page_total,
  coalesce(json_agg(_postgrest_t), '[]') AS body
FROM (
  SELECT * FROM pgrst_source
) _postgrest_t;

-- Step 6: Create a materialized view for count optimization (optional)
\echo ''
\echo '======================================'
\echo 'STEP 6: Creating Count Cache (Optional)'
\echo '======================================'

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

\echo 'Count cache system created'

-- Step 7: Add connection pooling recommendations
\echo ''
\echo '======================================'
\echo 'STEP 7: Connection Pool Settings (For Supabase Dashboard)'
\echo '======================================'
\echo 'IMPORTANT: Go to Supabase Dashboard > Settings > Database'
\echo 'Recommended settings:'
\echo '  - Pool Mode: Transaction'
\echo '  - Pool Size: 15'
\echo '  - Statement Timeout: 30s'
\echo '  - Connect Timeout: 10s'

-- Step 8: Create monitoring query
\echo ''
\echo '======================================'
\echo 'STEP 8: Monitoring Setup'
\echo '======================================'

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

\echo 'Slow query monitoring view created'

-- Step 9: Verify improvements
\echo ''
\echo '======================================'
\echo 'STEP 9: Verification'
\echo '======================================'

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

-- Show index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'users'
ORDER BY idx_scan DESC;

-- Final summary
\echo ''
\echo '======================================'
\echo '✅ OPTIMIZATION COMPLETE!'
\echo '======================================'
\echo 'Actions taken:'
\echo '  1. ✅ Increased statement timeout to 30s'
\echo '  2. ✅ Created optimized indexes on users table'
\echo '  3. ✅ Updated table statistics for query planner'
\echo '  4. ✅ Created count cache system'
\echo '  5. ✅ Added slow query monitoring'
\echo ''
\echo 'Next steps:'
\echo '  1. Monitor the application for improvements'
\echo '  2. Check slow_queries view regularly: SELECT * FROM slow_queries;'
\echo '  3. Consider implementing cursor-based pagination in the app'
\echo '======================================'