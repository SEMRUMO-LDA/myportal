# 🔒 ATIVAR RLS DE FORMA SEGURA

**Status**: 📋 GUIA PARA FUTURO (NÃO URGENTE)
**Risco**: 🟡 MÉDIO (se seguir o guia)
**Quando fazer**: Depois do BUILD 55 estar estável

---

## ⚠️ AVISO IMPORTANTE

**NÃO ATIVAR RLS AGORA!** Faz isto DEPOIS de:
1. BUILD 55 deployed e estável
2. Todos os utilizadores conseguem fazer login
3. Teres testado as policies em DEVELOPMENT primeiro

---

## 📋 PASSO A PASSO SEGURO

### FASE 1: Preparação (Development)

#### Step 1: Criar Function Helper (Opcional mas Recomendado)
```sql
-- Facilita verificação de roles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN', 'RH')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Step 2: Criar Policies (SEM ativar RLS ainda)
```sql
-- Policy 1: READ - Qualquer pessoa vê users ATIVOS (para login screen)
CREATE POLICY "users_read_active_public" ON users
  FOR SELECT
  USING (status = 'ACTIVE');

-- Policy 2: INSERT - Só admins criam users
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy 3: UPDATE - Admins editam tudo
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE
  USING (is_admin());

-- Policy 4: UPDATE - Users editam o próprio perfil (campos limitados)
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (
    -- Protege campos críticos de serem alterados
    OLD.id = NEW.id AND
    OLD.email = NEW.email AND
    OLD.role = NEW.role AND
    OLD.status = NEW.status AND
    OLD.auth_id = NEW.auth_id
  );

-- Policy 5: DELETE - Só super admins
CREATE POLICY "users_delete_superadmin" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
      AND role = 'SUPER_ADMIN'
    )
  );
```

#### Step 3: Testar Policies (SEM RLS ativo)
```bash
# No teu projeto
node check-rls-status.mjs

# Deve continuar a funcionar (RLS ainda OFF)
```

---

### FASE 2: Ativação em STAGING

#### Step 4: Ativar RLS (Momento crítico!)
```sql
-- ⚠️  CRÍTICO: Só fazer em STAGING primeiro!
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

#### Step 5: Testar TUDO
```bash
# Test 1: Login screen
# - Abrir /login
# - Deve ver lista de users (ou botão funcionar após 5s)
# - Conseguir fazer login

# Test 2: Admin panel
# - Ir para UserList
# - Deve ver todos os users
# - Conseguir editar/criar users

# Test 3: User normal
# - Login como EMPLOYEE
# - Ir para MyProfile
# - Conseguir editar próprio perfil
# - NÃO conseguir ver outros users em queries diretas

# Test 4: API calls
node check-rls-status.mjs
# Deve continuar a retornar users
```

#### Step 6: Monitorizar Logs
```sql
-- Ver queries que falharam (se houver)
SELECT * FROM pg_stat_statements
WHERE query LIKE '%users%'
AND calls > 0
ORDER BY mean_exec_time DESC;
```

---

### FASE 3: Ativação em PRODUCTION

#### Step 7: Backup COMPLETO
```bash
# No servidor Supabase
# Dashboard → Database → Backups
# Fazer backup manual antes de ativar RLS
```

#### Step 8: Horário de Baixo Tráfego
```
Escolher horário com poucos utilizadores online:
- Madrugada (2h-6h) ✅
- Fim de semana ✅
- Durante expediente ❌
```

#### Step 9: Ativar com Rollback Plan
```sql
-- ATIVAR
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Se algo correr mal (DESATIVAR imediatamente):
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

#### Step 10: Verificação Rápida (< 5 min)
```bash
# Test imediato
curl https://semrumo.eu/app/myportal/version.json

# Test login
# - Abrir /login em janela anónima
# - Fazer login com user de teste
# - Verificar se funciona em <10s

# Se FALHAR → ROLLBACK IMEDIATO (Step 9)
```

---

## 🚨 ROLLBACK PLAN

### Se algo correr mal:

```sql
-- DESATIVAR RLS IMEDIATAMENTE
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'users';
-- rowsecurity deve ser false
```

### Depois do rollback:
1. Investigar qual policy falhou
2. Testar em staging novamente
3. Corrigir policy
4. Repetir FASE 2

---

## ✅ POLICIES CORRETAS vs ❌ ERRADAS

### ❌ POLICY ERRADA (Bloqueia Login)
```sql
-- ERRO: Exige autenticação
CREATE POLICY "users_authenticated_only" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');
-- ❌ Login screen não está autenticado → Não vê users → Loop infinito
```

### ✅ POLICY CORRETA
```sql
-- OK: Permite ver users ATIVOS sem autenticação
CREATE POLICY "users_read_active_public" ON users
  FOR SELECT
  USING (status = 'ACTIVE');
-- ✅ Login screen vê users → Funciona
```

---

### ❌ POLICY ERRADA (Bloqueio Admin)
```sql
-- ERRO: Cada user só vê ele próprio
CREATE POLICY "users_own_only" ON users
  FOR SELECT
  USING (auth_id = auth.uid());
-- ❌ Admin não vê lista de colaboradores → Dashboard vazio
```

### ✅ POLICY CORRETA
```sql
-- OK: Users ativos visíveis + admins veem tudo
CREATE POLICY "users_read_smart" ON users
  FOR SELECT
  USING (
    status = 'ACTIVE' OR  -- Login screen vê ativos
    is_admin()            -- Admins veem todos
  );
-- ✅ Login funciona + Admin vê dashboard completo
```

---

## 🎯 TL;DR - RESUMO EXECUTIVO

### Resposta à pergunta original:

**"Se ativar o RLS no users posso bugar o uso da app?"**

✅ **SIM, pode bugar SE:**
- Ativares RLS sem criar policies ANTES
- Criares policies que exigem autenticação para SELECT
- Criares policies que só mostram o próprio user

🟢 **NÃO vai bugar SE:**
- Seguires este guia passo a passo
- Testares em staging primeiro
- Criares policy que permite SELECT em users ATIVOS (sem autenticação)

---

## 📊 QUANDO FAZER

### 🔴 AGORA (URGENTE)
- Deploy BUILD 55 (resolve problema atual)

### 🟡 ESTA SEMANA (NÃO URGENTE)
- Testar policies em development
- Criar staging environment

### 🟢 PRÓXIMO MÊS (IMPROVEMENT)
- Ativar RLS em staging
- Testar 1 semana
- Ativar RLS em production

---

## 🔗 SCRIPTS ÚTEIS

### Verificar se RLS está ativo
```bash
node check-rls-status.mjs
```

### Aplicar policies (quando estiveres pronto)
```bash
psql $DATABASE_URL -f migrations/003_apply_rls_policies.sql
```

---

## ❓ DÚVIDAS FREQUENTES

**Q: "Preciso ativar RLS para a app funcionar?"**
A: **NÃO**. RLS é opcional, para segurança extra. A app funciona sem RLS.

**Q: "Se não ativar RLS, há risco de segurança?"**
A: Depende. Se os teus API endpoints validam permissões, está OK. RLS é uma camada extra de segurança a nível de base de dados.

**Q: "O problema 'A carregar...' é por causa do RLS?"**
A: **NÃO**. Verificámos que RLS não está a bloquear. O problema é React state (BUILD 55 resolve).

**Q: "Devo ativar RLS antes ou depois do BUILD 55?"**
A: **DEPOIS**. Primeiro resolve o problema urgente (BUILD 55), depois melhora segurança (RLS).

---

**📌 GUARDE ESTE DOCUMENTO PARA FUTURO**

Quando estiveres pronto para ativar RLS, segue este guia passo a passo.
Por agora, foca no BUILD 55! 🚀
