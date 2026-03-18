-- ============================================
-- CORREÇÃO URGENTE: Login Lento no KIOSK
-- Problema: Colaboradores desistem por demora no login
-- Solução: Otimização específica para login rápido
-- ============================================

-- 🚨 PASSO 1: AUMENTAR TIMEOUT IMEDIATAMENTE
-- ============================================
ALTER DATABASE postgres SET statement_timeout = '60s';
ALTER ROLE authenticated SET statement_timeout = '60s';
ALTER ROLE anon SET statement_timeout = '60s';
SET statement_timeout = '60s';

-- 🚨 PASSO 2: CRIAR ÍNDICE CRÍTICO PARA LOGIN POR ID
-- ============================================
-- Este é o mais importante - login usa ID numérico
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_primary ON users(id);

-- Índice para busca rápida por PIN (login validation)
CREATE INDEX IF NOT EXISTS idx_users_pin_fast ON users(pin)
WHERE pin IS NOT NULL AND status = 'ACTIVE';

-- Índice composto para login completo
CREATE INDEX IF NOT EXISTS idx_users_login_kiosk ON users(id, pin, status)
WHERE status = 'ACTIVE';

-- 🚨 PASSO 3: CRIAR VIEW OTIMIZADA PARA LOGIN DO KIOSK
-- ============================================
CREATE OR REPLACE VIEW kiosk_login_users AS
SELECT
    id,
    name,
    pin,
    company,
    role,
    status,
    photo_url,
    work_start_time,
    work_end_time,
    lunch_start_time,
    lunch_end_time
FROM users
WHERE status = 'ACTIVE'
ORDER BY id;

-- Criar índice na view materializada para ainda mais velocidade
CREATE MATERIALIZED VIEW IF NOT EXISTS kiosk_users_cache AS
SELECT
    id,
    name,
    pin,
    company,
    role,
    status,
    photo_url,
    work_start_time,
    work_end_time,
    lunch_start_time,
    lunch_end_time
FROM users
WHERE status = 'ACTIVE'
ORDER BY id;

-- Índice único na view materializada
CREATE UNIQUE INDEX ON kiosk_users_cache(id);

-- 🚨 PASSO 4: OTIMIZAR TABELA TIME_LOGS (para dashboard após login)
-- ============================================
-- Índices para carregar rapidamente últimos logs
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON time_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_time_logs_today ON time_logs(date)
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Índice para buscar sessões abertas rapidamente
CREATE INDEX IF NOT EXISTS idx_time_logs_open_sessions ON time_logs(user_id, check_out)
WHERE check_out IS NULL;

-- 🚨 PASSO 5: CRIAR FUNÇÃO RÁPIDA PARA LOGIN
-- ============================================
CREATE OR REPLACE FUNCTION fast_kiosk_login(
    p_user_id INTEGER,
    p_pin TEXT
)
RETURNS TABLE(
    user_id INTEGER,
    user_name TEXT,
    user_role TEXT,
    user_company TEXT,
    user_photo TEXT,
    has_open_session BOOLEAN,
    last_check_in TIME,
    last_check_out TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.role,
        u.company,
        u.photo_url,
        EXISTS(
            SELECT 1 FROM time_logs tl
            WHERE tl.user_id = u.id
            AND tl.date = CURRENT_DATE
            AND tl.check_out IS NULL
        ) as has_open_session,
        (
            SELECT check_in FROM time_logs
            WHERE user_id = u.id
            AND date = CURRENT_DATE
            ORDER BY check_in DESC LIMIT 1
        ) as last_check_in,
        (
            SELECT check_out FROM time_logs
            WHERE user_id = u.id
            AND date = CURRENT_DATE
            ORDER BY check_out DESC LIMIT 1
        ) as last_check_out
    FROM users u
    WHERE u.id = p_user_id
    AND u.pin = p_pin
    AND u.status = 'ACTIVE'
    LIMIT 1;
END;
$$;

-- 🚨 PASSO 6: ATUALIZAR ESTATÍSTICAS
-- ============================================
ANALYZE users;
ANALYZE time_logs;
ANALYZE anomalies;
VACUUM ANALYZE users;

-- 🚨 PASSO 7: VERIFICAR MELHORIAS
-- ============================================
-- Testar query de login
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT id, name, pin, company, role, status
FROM users
WHERE id = 1
AND status = 'ACTIVE';

-- Mostrar índices criados
SELECT
    'ÍNDICES CRIADOS' as info,
    COUNT(*) || ' índices para login rápido' as resultado
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE '%kiosk%' OR indexname LIKE '%login%' OR indexname LIKE '%id%';

-- Verificar timeout
SELECT
    'TIMEOUT CONFIGURADO' as info,
    current_setting('statement_timeout') as resultado;

-- 🚨 PASSO 8: REFRESH AUTOMÁTICO DA CACHE
-- ============================================
-- Criar função para atualizar cache automaticamente
CREATE OR REPLACE FUNCTION refresh_kiosk_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY kiosk_users_cache;
END;
$$ LANGUAGE plpgsql;

-- Resultado final
SELECT
    '✅ OTIMIZAÇÃO COMPLETA!' as status,
    'Login do Kiosk deve estar INSTANTÂNEO agora' as mensagem,
    NOW() as aplicado_em;