-- FIX ATTENDANCE PAGE LOADING
-- Problema: A página de attendance não mostra imediatamente os colaboradores picados hoje
-- Solução: Otimização de queries e índices para carregamento rápido

-- 1. Criar índice composto para busca rápida por data
CREATE INDEX IF NOT EXISTS idx_time_logs_date_user_checkin
ON time_logs(date DESC, user_id, check_in DESC);

-- 2. Criar índice parcial para sessões abertas (check_out = null)
CREATE INDEX IF NOT EXISTS idx_time_logs_open_sessions
ON time_logs(date, user_id)
WHERE check_out IS NULL;

-- 3. Criar função otimizada para buscar attendance de hoje
CREATE OR REPLACE FUNCTION get_todays_attendance()
RETURNS TABLE (
    id INTEGER,
    user_id INTEGER,
    user_name VARCHAR,
    department VARCHAR,
    date DATE,
    check_in TIME,
    check_out TIME,
    status VARCHAR,
    total_hours DECIMAL,
    is_late BOOLEAN,
    is_open BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tl.id,
        tl.user_id,
        u.name as user_name,
        u.department,
        tl.date,
        tl.check_in,
        tl.check_out,
        tl.status,
        tl.total_hours,
        CASE
            WHEN tl.check_in IS NOT NULL AND u.work_start_time IS NOT NULL
            THEN tl.check_in > (u.work_start_time + INTERVAL '30 minutes')
            ELSE FALSE
        END as is_late,
        (tl.check_out IS NULL) as is_open
    FROM time_logs tl
    INNER JOIN users u ON tl.user_id = u.id
    WHERE tl.date = CURRENT_DATE
    ORDER BY tl.check_in DESC NULLS LAST;
END;
$$;

-- 4. Criar view materializada para performance extrema (opcional)
-- DROP MATERIALIZED VIEW IF EXISTS mv_todays_attendance;
-- CREATE MATERIALIZED VIEW mv_todays_attendance AS
-- SELECT * FROM get_todays_attendance();

-- 5. Atualizar estatísticas das tabelas
ANALYZE time_logs;
ANALYZE users;

-- 6. Verificar performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM time_logs
WHERE date = CURRENT_DATE
ORDER BY check_in DESC;

-- IMPORTANTE: Adicionar no código React um loading específico
-- e fazer fetch de hoje separadamente do histórico