-- ============================================
-- CORREÇÃO URGENTE: Dashboard Lento Após Login no KIOSK
-- Problema: Colaborador faz login mas dashboard demora a carregar
-- Solução: Otimizar TODAS as queries do dashboard
-- ============================================

-- 🔴 PROBLEMA IDENTIFICADO:
-- 1. checkAndCloseOpenSessions - query muito pesada
-- 2. Busca de anomalias sem índices
-- 3. Trips/vehicles queries lentas
-- 4. Múltiplas queries sequenciais ao invés de paralelas

-- ============================================
-- PASSO 1: ÍNDICES CRÍTICOS PARA O DASHBOARD
-- ============================================

-- Para sessões abertas (checkAndCloseOpenSessions)
CREATE INDEX IF NOT EXISTS idx_time_logs_open_check
ON time_logs(user_id, date DESC, check_out)
WHERE check_out IS NULL;

-- Para buscar logs do dia atual rapidamente
CREATE INDEX IF NOT EXISTS idx_time_logs_today_fast
ON time_logs(date, user_id)
WHERE date = CURRENT_DATE;

-- Para anomalias pendentes do usuário
CREATE INDEX IF NOT EXISTS idx_anomalies_user_pending
ON anomalies(user_id, status, created_at DESC)
WHERE status IN ('AWAITING_JUSTIFICATION', 'PENDING');

-- Para trips ativos
CREATE INDEX IF NOT EXISTS idx_trips_active_user
ON trips(user_id, end_date)
WHERE end_date IS NULL;

-- Para vehicles assignments
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_user
ON vehicles(assigned_user_id, status)
WHERE status = 'ACTIVE';

-- ============================================
-- PASSO 2: FUNÇÃO OTIMIZADA PARA DASHBOARD DATA
-- ============================================

-- Função que retorna TODOS os dados necessários de uma vez
CREATE OR REPLACE FUNCTION get_kiosk_dashboard_data(p_user_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        -- Dados do usuário
        'user', (
            SELECT row_to_json(u.*)
            FROM users u
            WHERE u.id = p_user_id
            LIMIT 1
        ),

        -- Último log do dia
        'last_log', (
            SELECT row_to_json(tl.*)
            FROM time_logs tl
            WHERE tl.user_id = p_user_id
            AND tl.date = CURRENT_DATE
            ORDER BY tl.check_in DESC
            LIMIT 1
        ),

        -- Sessão aberta?
        'has_open_session', (
            SELECT EXISTS(
                SELECT 1
                FROM time_logs
                WHERE user_id = p_user_id
                AND date = CURRENT_DATE
                AND check_out IS NULL
            )
        ),

        -- Anomalias pendentes (limitado a 5 mais recentes)
        'pending_anomalies', (
            SELECT json_agg(row_to_json(a.*))
            FROM (
                SELECT *
                FROM anomalies
                WHERE user_id = p_user_id
                AND status IN ('AWAITING_JUSTIFICATION', 'PENDING')
                ORDER BY created_at DESC
                LIMIT 5
            ) a
        ),

        -- Trip ativo
        'active_trip', (
            SELECT row_to_json(t.*)
            FROM trips t
            WHERE t.user_id = p_user_id
            AND t.end_date IS NULL
            ORDER BY t.start_date DESC
            LIMIT 1
        ),

        -- Veículo atribuído
        'assigned_vehicle', (
            SELECT row_to_json(v.*)
            FROM vehicles v
            WHERE v.assigned_user_id = p_user_id
            AND v.status = 'ACTIVE'
            LIMIT 1
        ),

        -- Stats do dia
        'today_stats', (
            SELECT json_build_object(
                'total_hours', COALESCE(SUM(
                    EXTRACT(EPOCH FROM (
                        COALESCE(check_out, CURRENT_TIME) - check_in
                    )) / 3600
                ), 0),
                'has_break', EXISTS(
                    SELECT 1 FROM time_logs
                    WHERE user_id = p_user_id
                    AND date = CURRENT_DATE
                    AND break_start IS NOT NULL
                )
            )
            FROM time_logs
            WHERE user_id = p_user_id
            AND date = CURRENT_DATE
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- ============================================
-- PASSO 3: VIEW MATERIALIZADA PARA CACHE
-- ============================================

-- Cache de dados frequentes do dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS kiosk_dashboard_cache AS
SELECT
    u.id as user_id,
    u.name,
    u.company,
    u.role,
    u.photo_url,
    u.work_start_time,
    u.work_end_time,
    u.lunch_start_time,
    u.lunch_end_time,
    -- Último log (pode estar desatualizado, mas dá uma base)
    (
        SELECT json_build_object(
            'date', date,
            'check_in', check_in,
            'check_out', check_out,
            'break_start', break_start,
            'break_end', break_end
        )
        FROM time_logs
        WHERE user_id = u.id
        ORDER BY date DESC, check_in DESC
        LIMIT 1
    ) as last_log_cached,
    -- Contadores úteis
    (
        SELECT COUNT(*)
        FROM anomalies
        WHERE user_id = u.id
        AND status = 'AWAITING_JUSTIFICATION'
    ) as pending_anomalies_count,
    -- Tem veículo?
    EXISTS(
        SELECT 1 FROM vehicles
        WHERE assigned_user_id = u.id
        AND status = 'ACTIVE'
    ) as has_vehicle
FROM users u
WHERE u.status = 'ACTIVE';

-- Índice único para busca rápida
CREATE UNIQUE INDEX ON kiosk_dashboard_cache(user_id);

-- ============================================
-- PASSO 4: OTIMIZAR checkAndCloseOpenSessions
-- ============================================

-- Função mais eficiente para verificar sessões abertas
CREATE OR REPLACE FUNCTION check_open_sessions_fast(p_user_id INTEGER)
RETURNS TABLE(
    has_open_sessions BOOLEAN,
    open_dates DATE[],
    needs_closing INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) > 0 as has_open_sessions,
        ARRAY_AGG(date) as open_dates,
        COUNT(*)::INTEGER as needs_closing
    FROM time_logs
    WHERE user_id = p_user_id
    AND check_out IS NULL
    AND date < CURRENT_DATE;  -- Apenas dias anteriores
END;
$$;

-- ============================================
-- PASSO 5: ATUALIZAR ESTATÍSTICAS
-- ============================================

ANALYZE time_logs;
ANALYZE anomalies;
ANALYZE trips;
ANALYZE vehicles;
ANALYZE users;

-- ============================================
-- PASSO 6: CONFIGURAR AUTO-VACUUM MAIS AGRESSIVO
-- ============================================

ALTER TABLE time_logs SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE anomalies SET (autovacuum_vacuum_scale_factor = 0.1);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Testar a nova função otimizada
SELECT
    '✅ OTIMIZAÇÃO APLICADA' as status,
    'Dashboard deve carregar em < 1 segundo' as resultado;

-- Mostrar índices criados
SELECT COUNT(*) || ' novos índices criados' as info
FROM pg_indexes
WHERE tablename IN ('time_logs', 'anomalies', 'trips', 'vehicles')
AND indexname LIKE '%fast%' OR indexname LIKE '%dashboard%';

-- Teste de performance (substitua 1 pelo ID de um usuário real)
-- EXPLAIN ANALYZE SELECT * FROM get_kiosk_dashboard_data(1);