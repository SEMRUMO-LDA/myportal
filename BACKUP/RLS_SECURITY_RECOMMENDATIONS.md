# Recomendações de Segurança RLS para MYPORTAL

**Data:** 2026-03-19
**Análise:** Utilizador 73 + Tabelas de Configuração

---

## 🔍 ANÁLISE ATUAL

### Status do RLS
✅ **Todas as tabelas de configuração estão acessíveis sem autenticação**

Tabelas testadas:
- `departments` - 12 registos ✅
- `locations` - 18 registos ✅
- `schedule_templates` - 8 registos ✅
- `schedule_periods` - 0 registos ✅ (vazia)
- `holidays` - 10 registos ✅
- `leave_types` - 6 registos ✅
- `anomaly_types` - 2 registos ✅
- `job_roles` - 6 registos ✅
- `permissions` - 16 registos ✅
- `role_permissions` - 76 registos ✅

---

## ⚠️ PROBLEMAS DE SEGURANÇA IDENTIFICADOS

### 1. Acesso Público a Dados Sensíveis
**Risco:** MÉDIO
**Descrição:** Tabelas de configuração estão acessíveis sem autenticação.

**Impacto:**
- Qualquer pessoa com a `ANON_KEY` (que está no frontend) pode ler:
  - Estrutura organizacional (departamentos)
  - Localizações físicas
  - Tipos de permissões e roles
  - Configurações de horários

**Dados expostos:**
```sql
-- Exemplo de query que QUALQUER PESSOA pode fazer:
SELECT * FROM departments;  -- Vê todos os departamentos
SELECT * FROM locations;     -- Vê todas as localizações
SELECT * FROM job_roles;     -- Vê todos os cargos
SELECT * FROM permissions;   -- Vê todas as permissões
```

### 2. Políticas RLS Provavelmente Desabilitadas
**Risco:** ALTO
**Descrição:** RLS pode estar completamente desabilitado ou com política `USING (true)`

---

## ✅ RECOMENDAÇÕES

### Opção 1: RLS Restritivo (MAIS SEGURO) ⭐ RECOMENDADO

#### Vantagens:
- ✅ Máxima segurança
- ✅ Controlo granular de quem vê o quê
- ✅ Auditoria completa de acessos

#### Desvantagens:
- ⚠️ Mais complexo de manter
- ⚠️ Todos os users precisam estar autenticados
- ⚠️ Pode causar problemas se a autenticação falhar

#### Implementação:

```sql
-- ============================================
-- POLÍTICAS RLS SEGURAS PARA TABELAS DE CONFIGURAÇÃO
-- ============================================

-- 1. DEPARTMENTS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;
CREATE POLICY "departments_select_authenticated" ON departments
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "departments_modify_admin" ON departments;
CREATE POLICY "departments_modify_admin" ON departments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('ADMIN', 'RH', 'CEO', 'Responsável de Departamento')
        )
    );

-- 2. LOCATIONS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_authenticated" ON locations;
CREATE POLICY "locations_select_authenticated" ON locations
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "locations_modify_admin" ON locations;
CREATE POLICY "locations_modify_admin" ON locations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('ADMIN', 'RH', 'CEO')
        )
    );

-- 3. SCHEDULE_TEMPLATES
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_templates_select_authenticated" ON schedule_templates;
CREATE POLICY "schedule_templates_select_authenticated" ON schedule_templates
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "schedule_templates_modify_admin" ON schedule_templates;
CREATE POLICY "schedule_templates_modify_admin" ON schedule_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- 4. SCHEDULE_PERIODS
ALTER TABLE schedule_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_periods_select_authenticated" ON schedule_periods;
CREATE POLICY "schedule_periods_select_authenticated" ON schedule_periods
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "schedule_periods_modify_admin" ON schedule_periods;
CREATE POLICY "schedule_periods_modify_admin" ON schedule_periods
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- 5. HOLIDAYS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_select_authenticated" ON holidays;
CREATE POLICY "holidays_select_authenticated" ON holidays
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "holidays_modify_admin" ON holidays;
CREATE POLICY "holidays_modify_admin" ON holidays
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- 6. LEAVE_TYPES
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_types_select_authenticated" ON leave_types;
CREATE POLICY "leave_types_select_authenticated" ON leave_types
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "leave_types_modify_admin" ON leave_types;
CREATE POLICY "leave_types_modify_admin" ON leave_types
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- 7. ANOMALY_TYPES
ALTER TABLE anomaly_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anomaly_types_select_authenticated" ON anomaly_types;
CREATE POLICY "anomaly_types_select_authenticated" ON anomaly_types
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "anomaly_types_modify_admin" ON anomaly_types;
CREATE POLICY "anomaly_types_modify_admin" ON anomaly_types
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('ADMIN', 'RH')
        )
    );

-- 8. JOB_ROLES
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_roles_select_authenticated" ON job_roles;
CREATE POLICY "job_roles_select_authenticated" ON job_roles
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "job_roles_modify_admin" ON job_roles;
CREATE POLICY "job_roles_modify_admin" ON job_roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role = 'ADMIN'
        )
    );

-- 9. PERMISSIONS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_select_authenticated" ON permissions;
CREATE POLICY "permissions_select_authenticated" ON permissions
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "permissions_modify_admin" ON permissions;
CREATE POLICY "permissions_modify_admin" ON permissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role = 'ADMIN'
        )
    );

-- 10. ROLE_PERMISSIONS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_select_authenticated" ON role_permissions;
CREATE POLICY "role_permissions_select_authenticated" ON role_permissions
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "role_permissions_modify_admin" ON role_permissions;
CREATE POLICY "role_permissions_modify_admin" ON role_permissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role = 'ADMIN'
        )
    );
```

---

### Opção 2: RLS Permissivo (MAIS SIMPLES)

#### Vantagens:
- ✅ Simples de implementar
- ✅ Não quebra se autenticação falhar
- ✅ Bom para prototipagem rápida

#### Desvantagens:
- ❌ Menor segurança
- ❌ Dados de configuração expostos publicamente

#### Implementação:

```sql
-- Permitir leitura pública, mas modificação só para admins
-- (Estado atual - NÃO RECOMENDADO para produção)

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_departments" ON departments FOR SELECT USING (true);
-- etc para todas as tabelas
```

---

## 🎯 DECISÃO RECOMENDADA

### Para PRODUÇÃO: Opção 1 (RLS Restritivo) ⭐

**Justificação:**
1. **Segurança:** Dados organizacionais não devem ser públicos
2. **Compliance:** GDPR e proteção de dados exigem controlo de acesso
3. **Auditoria:** RLS permite rastrear quem acedeu a quê
4. **Escalabilidade:** Mais fácil adicionar restrições no futuro

### Passos de Implementação:

1. **Backup da Base de Dados** (CRÍTICO!)
   ```bash
   # No Supabase Dashboard > Database > Backups > Create Backup
   ```

2. **Aplicar Políticas RLS**
   - Copiar SQL acima
   - Colar no Supabase SQL Editor
   - Executar

3. **Testar Acesso**
   ```bash
   node test-rls-tables.mjs
   ```

4. **Verificar Aplicação**
   - Login como utilizador normal
   - Verificar se vê departamentos, locais, etc.
   - Login como admin
   - Verificar se consegue editar

5. **Monitorizar Logs**
   - Supabase Dashboard > Logs
   - Procurar por erros "policy violation"

---

## 📊 IMPACTO NO DESEMPENHO

### RLS Restritivo:
- **Overhead:** ~5-10ms por query
- **Índices necessários:** `users.auth_id` (já existe)
- **Cache:** Supabase faz cache de políticas

### Otimização:
```sql
-- Criar índice para acelerar verificações de role
CREATE INDEX IF NOT EXISTS idx_users_auth_id_role
ON users(auth_id, role)
WHERE auth_id IS NOT NULL;
```

---

## 🔐 SEGURANÇA ADICIONAL

### 1. Rodar ANON_KEY Periodicamente
```bash
# Supabase Dashboard > Settings > API > Generate new anon key
# Atualizar .env.local com nova key
```

### 2. Rate Limiting
- Configurar no Supabase Dashboard
- Limitar requests por IP

### 3. Monitorização
- Configurar alertas para acessos suspeitos
- Log de todas as modificações em tabelas sensíveis

---

## 📝 CHECKLIST DE APLICAÇÃO

- [ ] Fazer backup da base de dados
- [ ] Testar SQL em ambiente de staging (se disponível)
- [ ] Aplicar políticas RLS
- [ ] Testar acesso com utilizador normal
- [ ] Testar acesso com admin
- [ ] Verificar logs do Supabase
- [ ] Testar aplicação completa
- [ ] Monitorizar durante 24h
- [ ] Documentar alterações

---

## ⚡ AÇÃO IMEDIATA RECOMENDADA

**URGENTE:** Aplicar RLS restritivo nas seguintes tabelas **sensíveis**:

1. ✅ `role_permissions` - Expõe estrutura de permissões
2. ✅ `permissions` - Lista todas as permissões do sistema
3. ✅ `job_roles` - Estrutura organizacional

**MENOS URGENTE** (mas recomendado):

4. `departments`
5. `locations`
6. `schedule_templates`
7. `holidays`
8. `leave_types`
9. `anomaly_types`
10. `schedule_periods`

---

## 💡 CONCLUSÃO

**Situação Atual:** Funciona, mas não é seguro para produção
**Recomendação:** Aplicar RLS Restritivo (Opção 1)
**Prioridade:** ALTA (antes de aumentar base de utilizadores)
**Risco Atual:** MÉDIO (exposição de dados organizacionais)

---

**Próximos Passos:**
1. Decidir qual opção usar
2. Agendar janela de manutenção (5-10 minutos)
3. Aplicar políticas
4. Testar exaustivamente
5. Monitorizar

---

**Contacto:** Se precisar de ajuda, revê este documento e os ficheiros SQL incluídos.
