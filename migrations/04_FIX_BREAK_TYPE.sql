-- ============================================================================
-- FIX: ALTERAR TIPO DE DADOS DAS PAUSAS (ALMOÇO) PARA TEXT
-- ============================================================================
-- A aplicação também envia a hora de almoço no formato "13:00" / "14:00"
-- na altura da saída. Precisamos de permitir que a BD aceite texto simples.

ALTER TABLE time_logs ALTER COLUMN break_start TYPE TEXT USING break_start::text;
ALTER TABLE time_logs ALTER COLUMN break_end TYPE TEXT USING break_end::text;
