# 🚨 Relatório de Incidente - RLS Security Implementation

**Data:** 2026-03-18
**Severidade:** CRÍTICA
**Status:** PRODUÇÃO AFETADA - Requer rollback imediato

---

## 📋 Resumo Executivo

Tentámos aplicar políticas de Row Level Security (RLS) para corrigir vulnerabilidades críticas identificadas no audit de segurança. A implementação falhou porque o sistema de autenticação da aplicação **não está integrado com o Supabase Auth**, causando bloqueio total do acesso aos dados.

**Impacto:** Aplicação em produção inacessível ("A carregar sistema..." infinito)

---

## 🔍 Causa Raiz

### Problema de Arquitetura

A aplicação usa **autenticação personalizada com IDs numéricos**:
- Login por PIN (4 dígitos)
- User IDs: `1`, `2`, `3`, etc. (integers)
- Não usa Supabase Auth (`auth.users` table)

As políticas RLS implementadas usam `auth.uid()`:
```sql
-- Esta policy NUNCA funciona porque:
USING (auth.uid()::text = user_id::text)

-- auth.uid() retorna NULL (user não autenticado via Supabase Auth)
-- user_id contém números: "1", "2", "3"
-- NULL != "1" ❌ Sempre false
```

### Consequência

- ✅ RLS ativado nas 8 tabelas críticas
- ❌ Nenhum user consegue ler dados (policies bloqueiam tudo)
- ❌ App presa em loading infinito

---

## ⚡ AÇÃO IMEDIATA NECESSÁRIA

### Rollback Manual (VIA INTERFACE SUPABASE)

O SQL Editor está com timeouts. **Usar a interface gráfica:**

#### Passo 1: Desativar RLS na tabela USERS (CRÍTICO)
1. Aceder: https://supabase.com/dashboard/project/imfhacvrivasciftaujm/editor
2. Menu lateral: **Database** → **Tables**
3. Clicar em tabela **`users`**
4. Tab **"Settings"** ou **"RLS"**
5. **Desativar:** "Enable Row Level Security"
6. **Save/Apply**

**Teste:** Refresh da app - deve desbloquear

#### Passo 2: Desativar RLS nas restantes tabelas (se necessário)

Repetir processo para:
- `anomalies`
- `time_logs`
- `internal_messages`
- `expenses`
- `leaves`
- `trips`
- `hour_bank_adjustments`

---

## 📊 Estado Atual

### Ficheiros Criados (para referência futura)

| Ficheiro | Propósito | Status |
|----------|-----------|--------|
| `AUDITORIA_SEGURANCA_RLS.md` | Audit completo de vulnerabilidades | ✅ Completo |
| `PRE_PRODUCTION_QA_REPORT.md` | Relatório Q&A pré-deploy | ✅ Completo |
| `migrations/fix_rls_critical_security.sql` | Tentativa 1 (timeout) | ❌ Falhou |
| `migrations/fix_rls_critical_security_v2.sql` | Tentativa 2 (manager_id error) | ❌ Falhou |
| `migrations/rls_quick_fix.sql` | Tentativa 3 (timeout) | ❌ Falhou |
| `migrations/EMERGENCY_DISABLE_RLS.sql` | Script de rollback | ⏳ Pendente |

### Vulnerabilidades Identificadas (NÃO CORRIGIDAS)

**CRÍTICAS (ainda existem):**
1. ❌ Anomalies: Qualquer user pode criar anomalias para outros
2. ❌ Users: Sem RLS - qualquer user vê todos os dados
3. ❌ Time_logs: Sem RLS - acesso total aos registos
4. ❌ Internal_messages: Sem RLS - mensagens visíveis a todos
5. ❌ Expenses, Leaves, Trips: Sem RLS - dados financeiros expostos

---

## 🛠️ Solução Correta (Implementação Futura)

### Opção A: Integrar Supabase Auth (RECOMENDADO)

**Vantagens:**
- RLS funciona nativamente
- Autenticação robusta (2FA, OAuth, etc.)
- Auditoria completa

**Desvantagens:**
- Requer refactoring significativo
- Migração de users existentes
- Tempo estimado: 2-3 dias

**Implementação:**
```sql
-- 1. Adicionar coluna auth_id
ALTER TABLE users ADD COLUMN auth_id UUID REFERENCES auth.users(id);

-- 2. Criar users no Supabase Auth
-- (processo manual ou script de migração)

-- 3. Policies funcionarão:
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = auth_id);
```

### Opção B: Custom Auth Bypass (INTERIM)

**Usar Service Role Key** para operações que precisam bypass RLS:

```typescript
// Backend/server-side only
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY // Bypass RLS
);

// Admins usam este client
const { data } = await supabaseAdmin
  .from('users')
  .select('*'); // Ignora RLS
```

**Desvantagens:**
- Service key só pode ser usada server-side
- Frontend continua sem RLS
- Solução parcial

### Opção C: Custom Session Management

**Criar tabela de sessões personalizada:**

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id),
    session_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- RLS baseado em session
CREATE POLICY "users_select_via_session" ON users
    FOR SELECT
    TO authenticated
    USING (
        id::text IN (
            SELECT user_id::text FROM user_sessions
            WHERE session_token = current_setting('app.session_token', true)
            AND expires_at > NOW()
        )
    );
```

**Desvantagens:**
- Complexo de implementar
- Requer middleware custom
- Manutenção adicional

---

## 📅 Próximos Passos

### Imediato (Hoje)
1. ✅ **Rollback RLS** via interface Supabase
2. ✅ Testar app em produção (deve voltar a funcionar)
3. ✅ Confirmar zero impacto nos users

### Curto Prazo (Esta Semana)
1. **Decisão arquitetural:** Escolher Opção A, B ou C
2. **Spike técnico:** Protótipo da solução escolhida (4h)
3. **Plano de migração:** Documento detalhado

### Médio Prazo (Próximas 2 Semanas)
1. Implementar solução de auth correta
2. Testes em staging
3. Deploy gradual com monitoring

---

## 📈 Lições Aprendidas

### O Que Correu Mal
1. ❌ Assumimos que app usava Supabase Auth (não usa)
2. ❌ Não testámos RLS em ambiente de teste primeiro
3. ❌ Deploy direto para produção sem validação
4. ❌ Timeouts do Supabase não considerados

### O Que Fazer Diferente
1. ✅ **Sempre testar em staging primeiro**
2. ✅ Verificar arquitetura de auth ANTES de implementar RLS
3. ✅ Ter plano de rollback testado
4. ✅ Implementar feature flags para rollback instantâneo
5. ✅ Monitoring de queries lentas

---

## 🔗 Referências

- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **Audit Report:** `AUDITORIA_SEGURANCA_RLS.md`
- **Q&A Report:** `PRE_PRODUCTION_QA_REPORT.md`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/imfhacvrivasciftaujm

---

## ✅ Checklist de Recuperação

- [ ] RLS desativado em `users` table
- [ ] App testada - login funciona
- [ ] RLS desativado em todas as outras tabelas (se necessário)
- [ ] Confirmar zero erros de user em produção
- [ ] Comunicar aos stakeholders (se aplicável)
- [ ] Agendar reunião de post-mortem
- [ ] Definir estratégia de auth para próximo sprint

---

**Autor:** Claude Code
**Revisão:** Pendente
**Próxima Atualização:** Após rollback completo
