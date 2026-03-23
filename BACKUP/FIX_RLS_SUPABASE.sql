-- ============================================
-- FIX RLS - POLÍTICAS CORRETAS PARA MYPORTAL
-- ============================================

-- PASSO 1: Desativar RLS temporariamente
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE locked_months DISABLE ROW LEVEL SECURITY;
ALTER TABLE hour_bank_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DEPOIS DE CONFIRMAR QUE FUNCIONA,
-- EXECUTAR ISTO PARA REATIVAR RLS COM POLICIES CORRETAS
-- ============================================

/*

-- USERS - Leitura pública (para login), escrita autenticada
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read users" ON users
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update users" ON users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- TIME_LOGS - Todos autenticados podem ler/inserir/atualizar
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated time_logs" ON time_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- LEAVES - Todos autenticados
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated leaves" ON leaves
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- LOCATIONS - Leitura pública
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read locations" ON locations
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write locations" ON locations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- SCHEDULE_TEMPLATES - Leitura pública
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read schedule_templates" ON schedule_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write schedule_templates" ON schedule_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- JOB_ROLES - Leitura pública
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read job_roles" ON job_roles
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write job_roles" ON job_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- HOLIDAYS - Leitura pública
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read holidays" ON holidays
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write holidays" ON holidays
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DEPARTMENTS - Leitura pública
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read departments" ON departments
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write departments" ON departments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ANOMALY_TYPES - Leitura pública
ALTER TABLE anomaly_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read anomaly_types" ON anomaly_types
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write anomaly_types" ON anomaly_types
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ANOMALIES - Todos autenticados
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated anomalies" ON anomalies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- EXPENSES - Todos autenticados
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated expenses" ON expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- INTERNAL_MESSAGES - Todos autenticados
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated internal_messages" ON internal_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- LOCKED_MONTHS - Leitura pública
ALTER TABLE locked_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read locked_months" ON locked_months
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write locked_months" ON locked_months
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- HOUR_BANK_ADJUSTMENTS - Todos autenticados
ALTER TABLE hour_bank_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated hour_bank_adjustments" ON hour_bank_adjustments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- EVENTS - Todos autenticados
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated events" ON events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- SURVEY_RESPONSES - Todos autenticados
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated survey_responses" ON survey_responses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ANONYMOUS_FEEDBACK - Todos autenticados
ALTER TABLE anonymous_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated anonymous_feedback" ON anonymous_feedback
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- NOTIFICATIONS - Todos autenticados
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated notifications" ON notifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- SETTINGS - Leitura pública
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read settings" ON settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated write settings" ON settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

*/
