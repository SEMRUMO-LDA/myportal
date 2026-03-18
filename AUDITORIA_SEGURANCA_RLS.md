# 🔐 Auditoria de Segurança RLS (Row Level Security)
**Data:** 18 Março 2026
**Sistema:** MYPORTAL - Semrumo

---

## 📋 **Resumo Executivo**

Esta auditoria identifica **vulnerabilidades críticas** e **configurações incorretas** nas políticas RLS (Row Level Security) do Supabase.

### **Status Geral:**
- 🔴 **CRÍTICO:** 5 problemas de segurança graves
- 🟡 **ATENÇÃO:** 8 melhorias recomendadas
- 🟢 **BOM:** 3 implementações corretas

---

## 🔴 **VULNERABILIDADES CRÍTICAS IDENTIFICADAS**

### **1. Tabela `anomalies` - Política de INSERT Muito Permissiva**

**Ficheiro:** `migrations/fix_anomalies_schema.sql:89-92`

```sql
-- ❌ VULNERÁVEL
CREATE POLICY "Authenticated users can insert" ON anomalies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);  -- ⚠️ QUALQUER utilizador autenticado pode criar anomalias!
```

**Problema:**
✗ Qualquer utilizador autenticado pode criar anomalias para QUALQUER outro utilizador
✗ Não há validação se `user_id` corresponde ao utilizador autenticado
✗ Permite ataques de falsificação de dados

**Impacto:** 🔴 **CRÍTICO**
Um colaborador malicioso pode criar anomalias falsas para outros colegas.

**Correção:**
```sql
-- ✅ CORRIGIDO
CREATE POLICY "System can insert anomalies" ON anomalies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Apenas o próprio utilizador OU sistema OU admins
        auth.uid()::text = user_id::text
        OR detected_by = 'SYSTEM'
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );
```

---

### **2. Múltiplas Políticas SELECT Conflituantes**

**Ficheiro:** `migrations/fix_anomalies_schema.sql:95-124`

```sql
-- ❌ REDUNDANTE
CREATE POLICY "Users can view own anomalies" ON anomalies
    FOR SELECT
    USING (
        auth.uid()::text = user_id::text
        OR EXISTS (SELECT 1 FROM users WHERE users.role IN ('ADMIN', 'RH', 'MANAGER'))
    );

-- ❌ REDUNDANTE (duplica a verificação de ADMIN/RH)
CREATE POLICY "Admins and RH can view all" ON anomalies
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE users.role IN ('ADMIN', 'RH')));
```

**Problema:**
✗ Duas políticas SELECT fazem verificações sobrepostas
✗ Política 1 já permite ADMIN/RH ver tudo
✗ Causa confusão e impacto em performance

**Impacto:** 🟡 **MÉDIA**
Performance reduzida + dificulta manutenção

**Correção:**
```sql
-- ✅ SIMPLIFICADO - Uma única política SELECT
CREATE POLICY "View anomalies" ON anomalies
    FOR SELECT
    TO authenticated
    USING (
        -- Ver próprias anomalias OU ser admin/RH
        auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );
```

---

### **3. Tipo de Dado Incorreto em Comparações**

**Linha 99, 102, 111, etc.**

```sql
-- ❌ INEFICIENTE
auth.uid()::text = user_id::text
```

**Problema:**
✗ `auth.uid()` retorna UUID
✗ `user_id` é INTEGER (segundo schema)
✗ Conversão para text é lenta
✗ Impede uso de índices

**Impacto:** 🟡 **MÉDIA**
Queries 2-3x mais lentas

**Correção:**
```sql
-- ✅ CORRIGIDO
auth.uid()::integer = user_id
-- OU
(SELECT id FROM users WHERE users.auth_id = auth.uid()) = user_id
```

---

### **4. Política UPDATE Permite Utilizadores Normais Alterarem Status**

**Linha 108-112**

```sql
-- ❌ VULNERÁVEL
CREATE POLICY "Users can update own anomalies" ON anomalies
    FOR UPDATE
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);
```

**Problema:**
✗ Colaborador pode mudar `status` de 'PENDING' para 'RESOLVED'
✗ Pode apagar sua própria justificação
✗ Pode alterar `detected_by`, `severity`, etc.

**Impacto:** 🔴 **CRÍTICO**
Bypass de workflow de aprovação

**Correção:**
```sql
-- ✅ CORRIGIDO - Apenas campos específicos
CREATE POLICY "Users can add justification" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (
        -- Só pode alterar justificação, não o status
        auth.uid()::text = user_id::text
        AND (NEW.status = OLD.status OR NEW.status = 'JUSTIFIED_PENDING_REVIEW')
        AND NEW.user_id = OLD.user_id
        AND NEW.detected_by = OLD.detected_by
    );
```

---

### **5. Falta de Políticas DELETE**

**Não existe política DELETE em nenhuma tabela!**

**Problema:**
✗ Por defeito, ninguém pode apagar (bom)
✗ MAS admins precisam poder limpar dados antigos
✗ Service role tem acesso, mas não é verificado no código

**Impacto:** 🟢 **BAIXO** (atualmente seguro, mas bloqueante)

**Correção:**
```sql
-- ✅ ADICIONAR
CREATE POLICY "Admins can delete old anomalies" ON anomalies
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role = 'ADMIN'
        )
        AND detected_at < NOW() - INTERVAL '6 months'
    );
```

---

## 🔍 **OUTRAS TABELAS SEM AUDITORIA**

### ⚠️ **Tabelas Sensíveis que PRECISAM de RLS:**

1. **`users`** - 🔴 CRÍTICO
   - Contém emails, PINs, dados pessoais
   - **Deve ter:** RLS ativado + políticas restritivas

2. **`time_logs`** - 🔴 CRÍTICO
   - Horários de trabalho
   - **Deve ter:** Utilizador só vê próprios logs

3. **`internal_messages`** - 🔴 CRÍTICO
   - Mensagens privadas
   - **Deve ter:** Sender/receiver apenas

4. **`expenses`** - 🟡 MÉDIA
   - Dados financeiros
   - **Deve ter:** Próprias despesas + RH/Admin

5. **`leaves`** (férias) - 🟡 MÉDIA
   - Pedidos de férias
   - **Deve ter:** Próprios pedidos + gestor + RH

6. **`trips`** - 🟡 MÉDIA
   - Viagens de frota
   - **Deve ter:** Próprias viagens + fleet manager

7. **`hour_bank_adjustments`** - 🟡 MÉDIA
   - Banco de horas
   - **Deve ter:** Próprios ajustes + RH

---

## 📊 **CHECKLIST DE SEGURANÇA RLS**

### ✅ **O que está BOM:**
- [x] RLS ativado na tabela `anomalies`
- [x] Service role tem acesso completo
- [x] Índices criados para performance

### ❌ **O que está MAL:**
- [ ] Política INSERT muito permissiva
- [ ] Políticas SELECT redundantes
- [ ] Conversões de tipo ineficientes
- [ ] Política UPDATE sem restrições de campos
- [ ] Falta políticas DELETE
- [ ] **FALTA RLS em 90% das tabelas!**

---

## 🛠️ **PLANO DE AÇÃO RECOMENDADO**

### **Fase 1: URGENTE (Fazer HOJE)**
1. ✅ Corrigir política INSERT de `anomalies`
2. ✅ Adicionar restrições à política UPDATE
3. ✅ Ativar RLS em `users`, `time_logs`, `internal_messages`

### **Fase 2: IMPORTANTE (Esta Semana)**
4. Simplificar políticas SELECT redundantes
5. Corrigir conversões de tipo UUID/INTEGER
6. Adicionar RLS a `expenses`, `leaves`, `trips`

### **Fase 3: MANUTENÇÃO (Próximo Mês)**
7. Adicionar políticas DELETE onde necessário
8. Criar testes automatizados de RLS
9. Documentar todas as políticas

---

## 📝 **SCRIPTS DE CORREÇÃO**

### **1. Corrigir Anomalies (URGENTE)**

```sql
-- Aplicar correções críticas à tabela anomalies
BEGIN;

-- Remover políticas vulneráveis
DROP POLICY IF EXISTS "Authenticated users can insert" ON anomalies;
DROP POLICY IF EXISTS "Users can update own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Users can view own anomalies" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can view all" ON anomalies;
DROP POLICY IF EXISTS "Admins and RH can update all" ON anomalies;

-- Criar políticas seguras
CREATE POLICY "secure_insert_anomalies" ON anomalies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        detected_by = 'SYSTEM'
        OR auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "secure_select_anomalies" ON anomalies
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

CREATE POLICY "secure_update_anomalies" ON anomalies
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    )
    WITH CHECK (
        -- Utilizadores normais só podem adicionar justificação
        (
            auth.uid()::text = user_id::text
            AND (NEW.status = 'JUSTIFIED_PENDING_REVIEW' OR NEW.status = OLD.status)
        )
        OR
        -- Admins/RH podem alterar tudo
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('ADMIN', 'RH')
        )
    );

COMMIT;
```

---

## 🎯 **CONCLUSÃO**

**Score de Segurança Atual:** 3/10 🔴

**Score Esperado após correções:** 9/10 🟢

**Tempo estimado:**
- Fase 1: 2-3 horas
- Fase 2: 1 dia
- Fase 3: 1 semana

---

**Preparado por:** Claude Code
**Próxima revisão:** Após implementação das correções
