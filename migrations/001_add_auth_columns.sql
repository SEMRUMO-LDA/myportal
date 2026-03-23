-- ============================================================================
-- MIGRATION 001: Add Supabase Auth Integration Columns
-- Created: 2026-03-18
-- Purpose: Prepare users table for Supabase Auth migration
-- ============================================================================

BEGIN;

-- Step 1: Add auth_id column (will link to auth.users.id)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Step 2: Add email column (required by Supabase Auth)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Step 3: Generate virtual emails for existing users
-- Format: user{id}@myportal.internal
UPDATE users
SET email = 'user' || id || '@myportal.internal'
WHERE email IS NULL;

-- Step 4: Make email unique and not null
ALTER TABLE users
  ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL;

-- Step 5: Add index on auth_id for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Step 6: Add constraint to link with auth.users (will be enforced after migration)
-- Note: We'll add the FK constraint after migrating users to avoid issues
-- ALTER TABLE users
--   ADD CONSTRAINT fk_users_auth
--   FOREIGN KEY (auth_id)
--   REFERENCES auth.users(id)
--   ON DELETE CASCADE;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify:
-- SELECT id, name, email, auth_id FROM users LIMIT 5;
--
-- Expected:
-- - All users have email in format user{id}@myportal.internal
-- - auth_id is NULL for now (will be filled by migration script)
-- ============================================================================
