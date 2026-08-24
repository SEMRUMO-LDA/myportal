-- ============================================================================
-- SCRIPT DE PREENCHIMENTO DE DADOS BASE CORRIGIDO
-- ============================================================================

-- Inserir Departamentos base
INSERT INTO departments (name, description)
VALUES 
  ('Geral', 'Departamento Geral'),
  ('Administração', 'Administração e Gestão'),
  ('Operações', 'Equipa Operacional'),
  ('Recursos Humanos', 'Gestão de Pessoal')
ON CONFLICT DO NOTHING;

-- Inserir Cargos base (a tabela job_roles só aceita name de acordo com o esquema)
INSERT INTO job_roles (name)
VALUES 
  ('Colaborador'),
  ('Técnico'),
  ('Coordenador'),
  ('Administrador')
ON CONFLICT DO NOTHING;

-- Inserir um Horário Padrão Genérico (formato JSONB para a grelha)
INSERT INTO schedule_templates (name, weekly_pattern)
VALUES
  ('Horário Normal (9h-18h)', 
  '[
    {"dayOfWeek": 1, "workStart": "09:00", "workEnd": "18:00", "lunchStart": "13:00", "lunchEnd": "14:00", "isWorkingDay": true},
    {"dayOfWeek": 2, "workStart": "09:00", "workEnd": "18:00", "lunchStart": "13:00", "lunchEnd": "14:00", "isWorkingDay": true},
    {"dayOfWeek": 3, "workStart": "09:00", "workEnd": "18:00", "lunchStart": "13:00", "lunchEnd": "14:00", "isWorkingDay": true},
    {"dayOfWeek": 4, "workStart": "09:00", "workEnd": "18:00", "lunchStart": "13:00", "lunchEnd": "14:00", "isWorkingDay": true},
    {"dayOfWeek": 5, "workStart": "09:00", "workEnd": "18:00", "lunchStart": "13:00", "lunchEnd": "14:00", "isWorkingDay": true},
    {"dayOfWeek": 6, "isWorkingDay": false},
    {"dayOfWeek": 0, "isWorkingDay": false}
  ]'::jsonb)
ON CONFLICT DO NOTHING;
