-- Migration: Remove unused 'code' field from users table
-- Date: 2026-03-18
-- Reason: Field is no longer used, replaced by 'id' as unique identifier

-- Step 1: Verify that the field exists and check for any data
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'code';

-- Step 2: Check if any non-null values exist (for safety)
SELECT COUNT(*) as count_with_code,
       COUNT(DISTINCT code) as unique_codes
FROM users
WHERE code IS NOT NULL AND code != '';

-- Step 3: Remove the column (only execute after confirming steps 1 and 2)
ALTER TABLE users DROP COLUMN IF EXISTS code;

-- Optional: Add comment to document the change
COMMENT ON TABLE users IS 'User table - code field removed on 2026-03-18, using id as unique identifier';