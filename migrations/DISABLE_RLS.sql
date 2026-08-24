-- ============================================================================
-- SCRIPT DE DESBLOQUEIO DE SEGURANÇA (RLS) PARA TESTES
-- ============================================================================
-- Corre este script no SQL Editor do Supabase para garantir que NENHUMA 
-- tabela bloqueia a app durante esta fase de testes.

-- 1. Desativar RLS nas tabelas principais para garantir o funcionamento
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;
ALTER TABLE locked_months DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE hour_bank_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE persistent_notifications DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que, mesmo que RLS esteja ativo em tabelas que escapem, há uma regra global permissiva
-- (Isto cria regras permissivas apenas nas tabelas que o Supabase permitir)
DO $$
DECLARE
    row record;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', row.tablename);
    END LOOP;
END;
$$;
