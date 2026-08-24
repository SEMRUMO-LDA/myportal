-- ============================================================================
-- SCRIPT DE CORREÇÃO DA TABELA LOCATIONS (Adição de colunas em falta)
-- ============================================================================

-- Adicionar colunas de contacto
ALTER TABLE locations ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS email VARCHAR(100);

-- Adicionar colunas de configuração de horário/contabilização extra
ALTER TABLE locations ADD COLUMN IF NOT EXISTS block_exit BOOLEAN DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS notification_emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS extra_hours_start INTEGER DEFAULT 0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS missing_hours_start INTEGER DEFAULT 0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS count_extra_after_exit BOOLEAN DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Europe/Lisbon';

-- (Opcional) Forçar reload da cache da API do Supabase para garantir que deteta as novas colunas
NOTIFY pgrst, 'reload schema';
