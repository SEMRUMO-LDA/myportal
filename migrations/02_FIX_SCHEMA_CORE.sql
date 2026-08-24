-- ============================================================================
-- FIX CORE SCHEMA: TIME_LOGS E ESTADO MENTAL
-- ============================================================================

-- 1. ADICIONAR COLUNAS EM FALTA NA TABELA TIME_LOGS
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50);
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);

-- 2. GARANTIR QUE RLS ESTÁ DESATIVADO NAS TABELAS CRÍTICAS DE FORMA DIRETA
-- (Isto garante que não falha como o script DO $$ pode falhar em alguns editores)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log DISABLE ROW LEVEL SECURITY;

-- 3. PERMISSÕES EXTRA
-- Garantir que a role Authenticated tem acesso direto
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
