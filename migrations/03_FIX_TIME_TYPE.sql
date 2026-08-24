-- ============================================================================
-- FIX: ALTERAR TIPO DE DADOS DO CHECK_IN / CHECK_OUT PARA TEXT
-- ============================================================================
-- A aplicação envia as horas no formato "10:49", mas a base de dados
-- estava a pedir o formato completo (TIMESTAMPTZ "2026-08-24T10:49:00Z").
-- Esta query resolve o problema ao permitir que a BD aceite o texto simples.

ALTER TABLE time_logs ALTER COLUMN check_in TYPE TEXT USING check_in::text;
ALTER TABLE time_logs ALTER COLUMN check_out TYPE TEXT USING check_out::text;
