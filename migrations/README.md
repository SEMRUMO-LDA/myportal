# Database Migrations

## Migration Order

Run migrations in numerical order:

1. **001_add_auth_columns.sql** - Adds auth columns to users table
2. **002_create_auth_helper_function.sql** - Creates auth helper functions for RLS
3. **003_apply_rls_policies.sql** - **PRODUCTION RLS** - Apply this for secure production environment
4. **004_optimize_time_logs_index.sql** - Performance optimization for time_logs
5. **005_create_whatsapp_clock_logs.sql** - WhatsApp integration tables

## Emergency Files (DO NOT USE IN PRODUCTION)

- ❌ **EMERGENCY_DISABLE_RLS.sql** - Only for emergency debugging, NEVER in production
- ❌ **DISABLE_ALL_RLS.sql** - DELETED - Use 003_apply_rls_policies.sql instead

## Performance Optimizations

- **FIX_ATTENDANCE_LOADING.sql** - Fixes slow attendance page loading
- **FIX_KIOSK_DASHBOARD_SPEED.sql** - Optimizes kiosk dashboard performance

## Important Notes

1. Always backup database before running migrations
2. Test migrations in staging environment first
3. RLS policies are CRITICAL for security - never disable in production
4. Use 003_apply_rls_policies.sql as the single source of truth for RLS

## Current Status

✅ Consolidated RLS policies in 003_apply_rls_policies.sql
❌ Removed conflicting TEST and DISABLE files to prevent accidents
