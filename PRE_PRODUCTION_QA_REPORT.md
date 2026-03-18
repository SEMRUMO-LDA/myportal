# 🔍 PRE-PRODUCTION Q&A REPORT
**Sistema:** MYPORTAL - Semrumo
**Data:** 18 Março 2026, 16h00
**Target Deploy:** HOJE às 18h00
**Q&A Team:** Senior Engineers Review

---

## 📊 **EXECUTIVE SUMMARY**

| Categoria | Status | Blocker | Ações |
|-----------|--------|---------|-------|
| **Build** | 🟢 PASS | ❌ NÃO | Nenhuma |
| **Segurança RLS** | 🔴 **FAIL** | ✅ **SIM** | CRÍTICO - Corrigir ANTES deploy |
| **Performance** | 🟡 WARNING | ❌ NÃO | Otimizado hoje |
| **Console Logs** | 🟡 WARNING | ❌ NÃO | Limpar para produção |
| **TODOs/FIXMEs** | 🟡 WARNING | ❌ NÃO | 120+ itens pendentes |
| **Testes** | 🔴 **FAIL** | ✅ **SIM** | 0 testes core funcionais |

**Recomendação:** ⛔ **NÃO FAZER DEPLOY HOJE**
**Risco:** 🔴 **ALTO** - Vulnerabilidades de segurança críticas

---

## 🚨 **BLOCKERS CRÍTICOS (MUST FIX)**

### **1. SEGURANÇA RLS - VULNERABILIDADES CRÍTICAS** 🔴
**Severidade:** CRÍTICA
**Impacto:** Colaboradores podem ver/alterar dados de outros utilizadores

**Problemas identificados:**
1. ✗ Tabela `anomalies` - Política INSERT permite qualquer user criar anomalias para outros
2. ✗ Tabela `users` - SEM RLS ativo (dados sensíveis expostos)
3. ✗ Tabela `time_logs` - SEM RLS ativo (horários de todos visíveis)
4. ✗ Tabela `internal_messages` - SEM RLS ativo (mensagens privadas expostas)
5. ✗ Tabela `expenses` - SEM RLS ativo (dados financeiros expostos)

**Ficheiro:** Ver [AUDITORIA_SEGURANCA_RLS.md](AUDITORIA_SEGURANCA_RLS.md)

**Ação Requerida:**
```sql
-- URGENTE: Aplicar antes de deploy
-- Executar script em AUDITORIA_SEGURANCA_RLS.md linha 247-305
```

**Tempo estimado:** 2-3 horas
**Blocker:** ✅ SIM - DEPLOY SEM ISTO É INSEGURO

---

### **2. FALTA DE TESTES AUTOMATIZADOS** 🔴
**Severidade:** ALTA
**Impacto:** Sem garantia que funcionalidades core funcionam

**Situação Atual:**
- 📂 377 ficheiros de teste encontrados
- ❌ **0 testes para funcionalidades críticas:**
  - Login (PIN/Admin)
  - Clock In/Out
  - Anomalias
  - Viagens
  - Férias

**Cenário de Risco:**
```
User tenta fazer login → FALHA
Utilizador faz clock-in → Não grava
Gestor aprova férias → Erro 500
```

**Ação Requerida:**
1. Criar testes E2E mínimos:
   - ✓ Login com PIN funciona
   - ✓ Clock In cria registo
   - ✓ Clock Out atualiza registo
   - ✓ Anomalias aparecem para gestor

**Tempo estimado:** 4-6 horas
**Blocker:** ✅ SIM - Sem testes = DEPLOY ÀS CEGAS

---

## ⚠️ **WARNINGS GRAVES (SHOULD FIX)**

### **3. CONSOLE LOGS EM PRODUÇÃO** 🟡
**Severidade:** MÉDIA
**Impacto:** Exposição de dados sensíveis nos logs do browser

**Estatísticas:**
- 📊 **2,073 console.log/error/warn** em 345 ficheiros
- 🔥 Principais ofensores:
  - `App.tsx`: 83 logs
  - `KioskDashboard.tsx`: 22 logs
  - `AttendanceControl.tsx`: 16 logs
  - `Login.tsx`: 36 logs

**Exemplos Problemáticos:**
```typescript
// ❌ MAL - Expõe dados de utilizador
console.log('[App] User authenticated:', { role: user.role, email: user.email });

// ❌ MAL - Expõe query results
console.log('Fetched users:', usersRes.data);

// ✅ BOM - Log genérico
console.log('[App] Authentication successful');
```

**Ação Requerida:**
1. Remover logs com dados sensíveis
2. Usar logger com níveis (production = erro apenas)
3. Implementar feature flag para debug logs

**Tempo estimado:** 2 horas
**Blocker:** ❌ NÃO - Mas má prática para produção

---

### **4. TODOs E FIXMEs NÃO RESOLVIDOS** 🟡
**Severidade:** MÉDIA
**Impacto:** Funcionalidades incompletas/bugs conhecidos

**Estatísticas:**
- 📊 **1,637 TODOs/FIXMEs/HACKs** em 334 ficheiros
- 🔥 Ficheiros com mais TODOs:
  - `App.tsx`: 20 TODOs
  - `AttendanceControl.tsx`: 5 TODOs
  - `AbsenceManagement.tsx`: 6 TODOs
  - `AnomalyDashboard.tsx`: 4 TODOs

**Exemplos Críticos Encontrados:**
```typescript
// ⚠️ Em resilientTimeLogService.ts
// TODO: Add retry logic for failed writes

// ⚠️ Em anomalyService.ts
// FIXME: Handle concurrent anomaly creation

// ⚠️ Em KioskDashboard.tsx
// TODO: Optimize session check performance
```

**Ação Requerida:**
1. Revisar TODOs críticos (FIXME, BUG, HACK)
2. Criar issues no tracker para TODOs não-críticos
3. Remover comentários obsoletos

**Tempo estimado:** 1 dia (triagem completa)
**Blocker:** ❌ NÃO - Mas indica dívida técnica alta

---

### **5. PERFORMANCE - SESSION CHECK LENTO** 🟡
**Severidade:** MÉDIA
**Impacto:** Utilizadores esperam 2-5s para ver botões

**Situação:**
- ✅ **RESOLVIDO HOJE** - Otimização aplicada
- Antes: 5s de loading
- Depois: UI instantânea (0.1s)

**Mudança Aplicada:**
```typescript
// ANTES
await checkAndCloseOpenSessions() // bloqueia UI
setLoading(false)

// DEPOIS
setLoading(false) // UI imediata
checkAndCloseOpenSessions() // background
```

**Ação Requerida:**
✅ NENHUMA - Já otimizado

**Blocker:** ❌ NÃO

---

## 📋 **CHECKLIST PRÉ-DEPLOY**

### **Ambiente & Build**
- [x] Build passa sem erros
- [x] Warnings do build são aceitáveis (chunk size)
- [ ] Variáveis de ambiente configuradas em produção
- [ ] .env.production existe e está correto
- [ ] SSL/HTTPS configurado
- [ ] Domain/DNS configurado

### **Base de Dados**
- [ ] **CRÍTICO:** RLS políticas corrigidas (ver script)
- [ ] Migrations aplicadas
- [ ] Backup da BD feito
- [ ] Rollback plan testado
- [ ] Índices criados (performance)

### **Segurança**
- [ ] **CRÍTICO:** Políticas RLS ativas em TODAS as tabelas
- [ ] Service role keys seguros
- [ ] API keys não expostas no frontend
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo (Supabase)
- [ ] Console.logs de dados sensíveis removidos

### **Funcionalidades Core**
- [ ] Login Admin funciona
- [ ] Login Colaborador (PIN) funciona
- [ ] Clock In/Out funciona
- [ ] Anomalias são criadas corretamente
- [ ] Aprovação de férias funciona
- [ ] Viagens/frota funciona
- [ ] Notificações funcionam
- [ ] Relatórios geram sem erro

### **Performance**
- [x] Loading do Kiosk otimizado (<1s)
- [ ] Images otimizadas
- [ ] Bundle size aceitável (<3MB)
- [ ] Lazy loading implementado
- [ ] Cache configurado

### **Monitoring**
- [ ] Sentry/error tracking configurado
- [ ] Analytics configurado (opcional)
- [ ] Health check endpoint criado
- [ ] Logs centralizados
- [ ] Alertas configurados

### **Backup & Recovery**
- [ ] Backup automático ativo
- [ ] Plano de rollback documentado
- [ ] Contactos de emergência definidos
- [ ] Procedimento de recovery testado

---

## 🔧 **SCRIPTS DE CORREÇÃO URGENTE**

### **1. Corrigir RLS (EXECUTAR PRIMEIRO)**

```bash
# Conectar à BD
psql "$DATABASE_URL"

# Aplicar correções do ficheiro
\i migrations/FIX_RLS_CRITICAL.sql
```

**Conteúdo do script:** Ver [AUDITORIA_SEGURANCA_RLS.md](AUDITORIA_SEGURANCA_RLS.md) linha 247

---

### **2. Remover Console Logs Sensíveis**

```bash
# Procurar logs com dados
grep -r "console.log.*user\|console.log.*password\|console.log.*token" --include="*.ts" --include="*.tsx"

# Substituir por logger
# TODO: Implementar logger com níveis
```

---

### **3. Criar Testes Mínimos**

```typescript
// tests/critical.e2e.test.ts
describe('Critical Flows', () => {
  test('Login with PIN works', async () => {
    // TODO: Implementar
  });

  test('Clock in creates time log', async () => {
    // TODO: Implementar
  });
});
```

---

## 📊 **RISCO ASSESSMENT**

| Cenário | Probabilidade | Impacto | Risco | Mitigação |
|---------|---------------|---------|-------|-----------|
| **Breach de dados (RLS)** | 🔴 ALTA | 🔴 CRÍTICO | 🔴 **CRÍTICO** | Corrigir RLS ANTES deploy |
| **Login falha em prod** | 🟡 MÉDIA | 🔴 CRÍTICO | 🔴 **ALTO** | Testes E2E mínimos |
| **Performance degrada** | 🟢 BAIXA | 🟡 MÉDIA | 🟡 **MÉDIO** | Já otimizado |
| **Logs expõem dados** | 🟡 MÉDIA | 🟡 MÉDIA | 🟡 **MÉDIO** | Remover logs sensíveis |
| **Bug em funcionalidade** | 🟡 MÉDIA | 🟡 MÉDIA | 🟡 **MÉDIO** | Rollback plan |

---

## 🎯 **RECOMENDAÇÃO FINAL**

### **❌ NÃO FAZER DEPLOY HOJE**

**Razões:**
1. 🔴 **Vulnerabilidades RLS críticas** - Risco de breach de dados
2. 🔴 **Sem testes automatizados** - Deploy às cegas
3. 🟡 **Console logs expõem dados** - Má prática

**Timeline Recomendado:**

### **DIA 1 (Amanhã - 19 Março):**
- [ ] Aplicar correções RLS (3h)
- [ ] Criar testes E2E mínimos (4h)
- [ ] Remover logs sensíveis (2h)
- ✅ **Total: 9h** (1 dia de trabalho)

### **DIA 2 (20 Março):**
- [ ] Deploy em staging
- [ ] Testes manuais completos
- [ ] Validação de segurança
- [ ] Preparar rollback
- ✅ **Total: 4h** (meio dia)

### **DIA 3 (21 Março - Sexta):**
- [ ] 🚀 **DEPLOY PRODUÇÃO** (manhã)
- [ ] Monitoring intensivo
- [ ] Suporte standby
- ✅ **Go-Live seguro**

---

## 📞 **CONTACTOS EMERGÊNCIA**

**Se deploy urgente é OBRIGATÓRIO hoje:**

### **Plano B - Deploy Mínimo Seguro (3h):**
1. ✅ **OBRIGATÓRIO:** Aplicar script RLS (1h)
2. ✅ **OBRIGATÓRIO:** Teste manual login/clock (30min)
3. ✅ **OBRIGATÓRIO:** Remover logs com emails/pins (1h)
4. ✅ **OBRIGATÓRIO:** Configurar rollback (30min)
5. 🚀 Deploy com monitoring 24/7

**⚠️ AVISO:** Este é um deploy de ALTO RISCO sem testes

---

## ✅ **SIGN-OFF**

**Q&A Team:** ⛔ **NÃO APROVADO** para produção
**Recommendation:** Adiar 48h para correções críticas
**Fallback:** Se urgente, executar Plano B com monitorização 24/7

**Aprovações Necessárias:**
- [ ] CTO/Tech Lead (reconhece riscos)
- [ ] Product Owner (aceita deploy arriscado)
- [ ] DevOps (confirma rollback pronto)

---

**Relatório gerado por:** Claude Code Q&A Assistant
**Próxima revisão:** Após aplicação das correções críticas
