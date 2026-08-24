-- ============================================================================
-- MYPORTAL — Schema Setup for New Supabase Instance
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/pehkabxxhivuuyrvpmmw/sql/new)
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════
-- 1. USERS TABLE (core)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(100) DEFAULT 'Colaborador',
  company VARCHAR(100) DEFAULT 'SEMRUMO',
  department VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  pin VARCHAR(10),
  requires_new_pin BOOLEAN DEFAULT true,
  nif VARCHAR(20),
  cc VARCHAR(30),
  niss VARCHAR(30),
  nationality VARCHAR(100),
  marital_status VARCHAR(50),
  address TEXT,
  birth_date DATE,
  admission_date DATE,
  phone VARCHAR(30),
  mobile_phone VARCHAR(30),
  whatsapp_enabled BOOLEAN DEFAULT false,
  emergency_contact JSONB,
  work_start_time VARCHAR(5) DEFAULT '09:00',
  work_end_time VARCHAR(5) DEFAULT '18:00',
  lunch_start_time VARCHAR(5) DEFAULT '13:00',
  lunch_end_time VARCHAR(5) DEFAULT '14:00',
  vacation_days_yearly INTEGER DEFAULT 22,
  vacation_days_carryover INTEGER DEFAULT 0,
  vacation_adjustments INTEGER DEFAULT 0,
  photo_url TEXT,
  bio TEXT,
  iban VARCHAR(50),
  attendance_config JSONB,
  onboarding_tasks JSONB,
  documents JSONB DEFAULT '[]'::jsonb,
  location_id INTEGER,
  location_ids JSONB DEFAULT '[]'::jsonb,
  schedule_template_id INTEGER,
  schedule_cycle_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  must_change_password BOOLEAN DEFAULT false
);

-- ═══════════════════════════════════════════
-- 2. TIME_LOGS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS time_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'PRESENT',
  total_hours NUMERIC(5,2),
  check_in_location TEXT,
  check_in_ip VARCHAR(50),
  check_in_coordinates JSONB,
  check_out_location TEXT,
  check_out_ip VARCHAR(50),
  check_out_coordinates JSONB,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 3. LEAVES TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leaves (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  leave_type_id INTEGER,
  leave_type VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(5,1),
  status VARCHAR(50) DEFAULT 'PENDING',
  notes TEXT,
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 4. EXPENSES TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  user_name VARCHAR(255),
  user_company VARCHAR(100),
  date DATE NOT NULL,
  category VARCHAR(100),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  submission_date TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 5. INTERNAL MESSAGES TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS internal_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT,
  sender_name VARCHAR(255),
  receiver_id BIGINT NOT NULL,
  subject VARCHAR(500),
  content TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'normal'
);

-- ═══════════════════════════════════════════
-- 6. EVENTS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(100),
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 7. LOCATIONS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS locations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  coordinates JSONB,
  allowed_ips JSONB DEFAULT '[]'::jsonb,
  tolerance_entry INTEGER DEFAULT 15,
  tolerance_exit INTEGER DEFAULT 15,
  block_entry BOOLEAN DEFAULT false,
  block_exit BOOLEAN DEFAULT false,
  notification_emails JSONB DEFAULT '[]'::jsonb,
  extra_hours_start INTEGER,
  missing_hours_start INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 8. DEPARTMENTS, JOB_ROLES, HOLIDAYS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS departments (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  manager_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) DEFAULT 'national',
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 9. ANOMALIES & TYPES
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anomaly_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  severity VARCHAR(50) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomalies (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  anomaly_type_id INTEGER,
  date DATE,
  status VARCHAR(50) DEFAULT 'PENDING',
  manager_id BIGINT,
  manager_notes TEXT,
  employee_justification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 10. SCHEDULE & LEAVE TYPES
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS locked_months (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  is_locked BOOLEAN DEFAULT true,
  locked_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS schedule_periods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  template_id INTEGER,
  location_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  weekly_pattern JSONB DEFAULT '[]'::jsonb,
  cycle_days INTEGER,
  cycle_pattern JSONB,
  total_weekly_hours NUMERIC(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  color VARCHAR(20),
  max_days INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  paid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 11. HOUR BANK, SURVEYS, FEEDBACK
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hour_bank_adjustments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  adjustment_minutes INTEGER NOT NULL,
  reason TEXT,
  type VARCHAR(50),
  created_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  survey_type VARCHAR(100),
  reference_date DATE,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anonymous_feedback (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(100),
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  hr_response TEXT,
  resolved_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 12. APP SETTINGS & NOTIFICATIONS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persistent_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(100),
  title VARCHAR(500),
  description TEXT,
  severity VARCHAR(50) DEFAULT 'info',
  category VARCHAR(100),
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  reference_id BIGINT,
  reference_table VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON time_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(date);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_user ON anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON persistent_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON internal_messages(receiver_id);

-- ═══════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════
INSERT INTO users (id, name, email, role, company, department, status, pin, requires_new_pin)
VALUES (73, 'Tiago Pacheco', 'tiago@semrumo.eu', 'ADMIN', 'SEMRUMO', 'Administração', 'ACTIVE', '000000', false)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1));

INSERT INTO leave_types (name, code, color, max_days, requires_approval, paid) VALUES
  ('Férias', 'FERIAS', '#3B82F6', 22, true, true),
  ('Doença', 'DOENCA', '#EF4444', null, false, true),
  ('Casamento', 'CASAMENTO', '#EC4899', 15, true, true),
  ('Falecimento', 'FALECIMENTO', '#6B7280', 5, false, true),
  ('Parentalidade', 'PARENTALIDADE', '#8B5CF6', 120, true, true),
  ('Injustificada', 'INJUSTIFICADA', '#F59E0B', null, false, false)
ON CONFLICT DO NOTHING;

INSERT INTO app_settings (key, value) VALUES
  ('whatsapp_auto_alerts', 'false'),
  ('llm_provider', 'openrouter'),
  ('company_name', 'SEMRUMO')
ON CONFLICT (key) DO NOTHING;

COMMIT;
