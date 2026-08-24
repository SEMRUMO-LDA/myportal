-- ============================================================================
-- SCRIPT DE CORREÇÃO DA TABELA LOCATIONS (Parte 2)
-- ============================================================================

-- A aplicação envia 'locality' e 'observations' (além dos que já adicionámos)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS locality VARCHAR(150);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS observations TEXT;

-- Forçar reload da cache da API do Supabase 
NOTIFY pgrst, 'reload schema';
