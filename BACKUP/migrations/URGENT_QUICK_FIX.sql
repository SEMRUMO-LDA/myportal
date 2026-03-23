-- ============================================
-- EXECUTE ISTO AGORA NO SUPABASE SQL EDITOR!
-- Correção Urgente de Timeout
-- ============================================

-- 1. AUMENTAR TIMEOUT (MAIS IMPORTANTE!)
ALTER DATABASE postgres SET statement_timeout = '30s';
ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE anon SET statement_timeout = '30s';
ALTER ROLE service_role SET statement_timeout = '60s';
SET statement_timeout = '60s';

-- 2. CRIAR ÍNDICES ESSENCIAIS
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. ATUALIZAR ESTATÍSTICAS
ANALYZE users;
ANALYZE time_logs;
ANALYZE anomalies;

-- 4. VERIFICAR SE FUNCIONOU
SELECT
    'TIMEOUT AUMENTADO PARA' as info,
    current_setting('statement_timeout') as valor;

SELECT
    'ÍNDICES CRIADOS' as info,
    COUNT(*) || ' índices na tabela users' as valor
FROM pg_indexes
WHERE tablename = 'users';

SELECT
    'STATUS' as info,
    '✅ CORREÇÃO APLICADA - TESTE O SISTEMA AGORA!' as valor;