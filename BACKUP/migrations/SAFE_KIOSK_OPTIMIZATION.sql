-- ============================================
-- VERSÃO SEGURA: Otimização Kiosk com Rollback
-- Data: 2026-03-18
-- ⚠️  LEIA ANTES DE EXECUTAR
-- ============================================

-- 🔒 ANÁLISE DE SEGURANÇA:
-- ✅ SEGURO: Criar índices (não afeta dados)
-- ✅ SEGURO: Criar views (apenas leitura)
-- ⚠️  CUIDADO: Alterar timeouts (pode afetar outras queries)
-- ✅ SEGURO: ANALYZE (apenas atualiza estatísticas)
-- ❌ NUNCA: DELETE, DROP TABLE, TRUNCATE

-- ============================================
-- PASSO 0: CRIAR BACKUP POINT (SEGURANÇA)
-- ============================================
-- No Supabase, faça um backup manual primeiro:
-- Dashboard > Settings > Backups > Create Backup

-- Verificar estado atual ANTES de mudanças
SELECT
    'ESTADO ANTES DAS MUDANÇAS' as info,
    current_setting('statement_timeout') as timeout_atual,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'users') as indices_users,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'time_logs') as indices_time_logs,
    NOW() as timestamp_backup;

-- Guardar configuração atual numa tabela temporária
CREATE TEMP TABLE IF NOT EXISTS backup_settings AS
SELECT
    'statement_timeout' as setting_name,
    current_setting('statement_timeout') as original_value,
    NOW() as backup_time;

-- ============================================
-- PARTE 1: MUDANÇAS 100% SEGURAS (APENAS ÍNDICES)
-- ============================================

-- 1.1 ÍNDICES (SEGURO - não altera dados, apenas melhora performance)
-- Verificar se índice já existe antes de criar
DO $$
BEGIN
    -- Índice principal do ID (mais importante)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'users'
        AND indexname = 'idx_users_id_primary'
    ) THEN
        CREATE UNIQUE INDEX idx_users_id_primary ON users(id);
        RAISE NOTICE 'Índice idx_users_id_primary criado';
    ELSE
        RAISE NOTICE 'Índice idx_users_id_primary já existe';
    END IF;

    -- Índice para PIN ativo
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'users'
        AND indexname = 'idx_users_pin_fast'
    ) THEN
        CREATE INDEX idx_users_pin_fast ON users(pin)
        WHERE pin IS NOT NULL AND status = 'ACTIVE';
        RAISE NOTICE 'Índice idx_users_pin_fast criado';
    END IF;

    -- Índices para time_logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'time_logs'
        AND indexname = 'idx_time_logs_user_date'
    ) THEN
        CREATE INDEX idx_time_logs_user_date ON time_logs(user_id, date DESC);
        RAISE NOTICE 'Índice idx_time_logs_user_date criado';
    END IF;

    -- Índice para sessões abertas
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'time_logs'
        AND indexname = 'idx_time_logs_open_sessions'
    ) THEN
        CREATE INDEX idx_time_logs_open_sessions ON time_logs(user_id, check_out)
        WHERE check_out IS NULL;
        RAISE NOTICE 'Índice idx_time_logs_open_sessions criado';
    END IF;

    -- Índices para anomalias
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'anomalies'
        AND indexname = 'idx_anomalies_user_pending'
    ) THEN
        CREATE INDEX idx_anomalies_user_pending
        ON anomalies(user_id, status, created_at DESC)
        WHERE status IN ('AWAITING_JUSTIFICATION', 'PENDING');
        RAISE NOTICE 'Índice idx_anomalies_user_pending criado';
    END IF;
END $$;

-- 1.2 ANALYZE (SEGURO - apenas atualiza estatísticas)
ANALYZE users;
ANALYZE time_logs;
ANALYZE anomalies;

-- ============================================
-- PARTE 2: MUDANÇAS COM CUIDADO (TIMEOUTS)
-- ============================================

-- 2.1 Primeiro, vamos testar com um timeout maior APENAS para esta sessão
-- (não afeta outros usuários)
SET LOCAL statement_timeout = '30s';  -- LOCAL = apenas esta transação

-- 2.2 Testar se queries funcionam com novo timeout
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Teste 1: Query simples de users
    SELECT COUNT(*) as cnt INTO test_result FROM users WHERE status = 'ACTIVE';
    RAISE NOTICE 'Teste 1 OK: % users ativos', test_result.cnt;

    -- Teste 2: Query complexa de time_logs
    SELECT COUNT(*) as cnt INTO test_result
    FROM time_logs
    WHERE date >= CURRENT_DATE - INTERVAL '30 days';
    RAISE NOTICE 'Teste 2 OK: % logs últimos 30 dias', test_result.cnt;

    -- Se chegou aqui, testes passaram
    RAISE NOTICE 'Todos os testes passaram com timeout de 30s';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Teste falhou: %. Timeout pode ser muito baixo.', SQLERRM;
END $$;

-- 2.3 SE E SOMENTE SE os testes passaram, aplicar globalmente
-- COMENTADO POR SEGURANÇA - Descomente apenas após verificar testes acima
/*
ALTER DATABASE postgres SET statement_timeout = '30s';
ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE anon SET statement_timeout = '30s';
*/

-- ============================================
-- PARTE 3: CRIAR VIEWS (SEGURO - apenas leitura)
-- ============================================

-- View para login rápido (não materializada = sempre atualizada)
CREATE OR REPLACE VIEW kiosk_login_view AS
SELECT
    id,
    name,
    pin,
    company,
    role,
    status,
    photo_url
FROM users
WHERE status = 'ACTIVE'
ORDER BY id;

-- Função otimizada para buscar dados do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_essentials(p_user_id INTEGER)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT json_build_object(
        'has_open_session', EXISTS(
            SELECT 1 FROM time_logs
            WHERE user_id = p_user_id
            AND date = CURRENT_DATE
            AND check_out IS NULL
        ),
        'last_check_in', (
            SELECT check_in FROM time_logs
            WHERE user_id = p_user_id
            AND date = CURRENT_DATE
            ORDER BY check_in DESC
            LIMIT 1
        ),
        'pending_anomalies_count', (
            SELECT COUNT(*)
            FROM anomalies
            WHERE user_id = p_user_id
            AND status IN ('AWAITING_JUSTIFICATION', 'PENDING')
        )
    );
$$;

-- ============================================
-- PARTE 4: VERIFICAÇÃO E ROLLBACK
-- ============================================

-- 4.1 Verificar se otimizações funcionaram
WITH performance_check AS (
    SELECT
        'users_query' as test,
        COUNT(*) as result
    FROM users
    WHERE id = 1 AND status = 'ACTIVE'
),
index_check AS (
    SELECT
        'new_indexes' as test,
        COUNT(*) as result
    FROM pg_indexes
    WHERE tablename IN ('users', 'time_logs', 'anomalies')
    AND indexname LIKE 'idx_%'
)
SELECT * FROM performance_check
UNION ALL
SELECT * FROM index_check;

-- 4.2 SCRIPT DE ROLLBACK (guarde isto!)
-- Se algo der errado, execute:
/*
-- ROLLBACK DOS TIMEOUTS
ALTER DATABASE postgres RESET statement_timeout;
ALTER ROLE authenticated RESET statement_timeout;
ALTER ROLE anon RESET statement_timeout;

-- REMOVER ÍNDICES CRIADOS (se necessário)
DROP INDEX IF EXISTS idx_users_id_primary;
DROP INDEX IF EXISTS idx_users_pin_fast;
DROP INDEX IF EXISTS idx_time_logs_user_date;
DROP INDEX IF EXISTS idx_time_logs_open_sessions;
DROP INDEX IF EXISTS idx_anomalies_user_pending;

-- REMOVER VIEWS E FUNÇÕES
DROP VIEW IF EXISTS kiosk_login_view;
DROP FUNCTION IF EXISTS get_dashboard_essentials(INTEGER);
*/

-- ============================================
-- RESULTADO FINAL
-- ============================================
SELECT
    '✅ OTIMIZAÇÕES SEGURAS APLICADAS' as status,
    'Índices criados: SIM' as indices,
    'Views criadas: SIM' as views,
    'Timeouts alterados: NÃO (descomentado por segurança)' as timeouts,
    'Para aplicar timeouts, descomente a seção 2.3' as nota,
    NOW() as aplicado_em;