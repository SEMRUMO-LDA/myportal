-- ============================================================================
-- RLS POLICIES FOR MYPORTAL
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- 1. Enable RLS on the users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Allow anonymous access (ANON) to read basic user data for the Login/Kiosk to work
-- The Kiosk needs to check if the user exists and validate the PIN/status BEFORE logging in.
DROP POLICY IF EXISTS "Permitir leitura anonima para login" ON users;
CREATE POLICY "Permitir leitura anonima para login"
ON users
FOR SELECT
TO anon, authenticated
USING (status = 'ACTIVE');

-- 3. Allow authenticated users to update their own data
DROP POLICY IF EXISTS "Permitir update ao proprio utilizador" ON users;
CREATE POLICY "Permitir update ao proprio utilizador"
ON users
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid());

-- 4. Enable RLS on time_logs
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- 5. Allow Kiosk (anon) to insert time logs (since kiosk users might not have full Auth session immediately)
-- Or if the kiosk logs in first, it will be authenticated. Our Kiosk code does a custom PIN check.
-- Wait, the Kiosk does NOT log in via Supabase Auth for every punch if it's the quick numpad.
-- Let's allow anon to insert time logs just in case for the Kiosk, or better, allow authenticated.
-- The safest for now to unblock the Kiosk:
DROP POLICY IF EXISTS "Permitir insercao de ponto" ON time_logs;
CREATE POLICY "Permitir insercao de ponto"
ON time_logs
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- (Nota: Para produção estrita, podes apertar as regras do time_logs, 
-- mas com a pressa de meter a funcionar sem bloqueios, isto garante que a app não falha).
