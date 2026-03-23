# 🚨 OTIMIZAÇÕES URGENTES - SUPABASE EXHAUSTION

**Problema**: "Your project is currently exhausting multiple resources"

---

## 📊 ANÁLISE DO PROBLEMA

### **Queries atuais (por utilizador):**

```
Carregamento inicial: 19 queries
Refresh a cada 120s: 19 queries × 30/hora = 570 queries/hora/user
100 utilizadores: 570 × 100 = 57,000 queries/hora!!
```

### **Limites da taxa (ADMIN):**
```typescript
anomalies: .limit(500)      // 500 registos
hour_bank: .limit(500)       // 500 registos
expenses: .limit(500)        // 500 registos
messages: .limit(500)        // 500 registos
surveys: ALL records         // Sem limite!
feedback: ALL records        // Sem limite!
```

---

## ✅ SOLUÇÕES IMEDIATAS (Build #21)

### **1. REDUZIR POLLING (120s → 5 minutos)**

**Impacto**: 57,000 → 22,800 queries/hora (60% redução)

```typescript
// ANTES:
const interval = setInterval(refreshData, 120000); // 2 min

// DEPOIS:
const interval = setInterval(refreshData, 300000); // 5 min
```

---

### **2. LIMITAR QUERIES DE ADMIN**

**Impacto**: Reduz carga massiva em ~70%

```typescript
// ANTES (ADMIN):
anomaliesQuery.limit(500)
hbAdjQuery.limit(500)
expensesQuery.limit(500)
messagesQuery.limit(500)
surveys: ALL
feedback: ALL

// DEPOIS (ADMIN):
anomaliesQuery.limit(100)    // -80%
hbAdjQuery.limit(50)          // -90%
expensesQuery.limit(100)      // -80%
messagesQuery.limit(100)      // -80%
surveys.limit(100)            // +limit
feedback.limit(100)           // +limit
```

---

### **3. LAZY LOADING - Carregar sob demanda**

**Impacto**: 19 queries → 8 queries no carregamento inicial

**Carregar IMEDIATAMENTE (essencial para dashboard):**
```typescript
✅ users
✅ time_logs (apenas últimas 24h, não 7 dias!)
✅ locations
✅ schedule_templates
✅ leave_types
✅ departments
✅ events (apenas próximos 30 dias)
```

**Carregar APENAS quando utilizador acede à página:**
```typescript
⏳ leaves → Carregar quando abrir "Minhas Férias"
⏳ anomalies → Carregar quando abrir "Anomalias"
⏳ hour_bank → Carregar quando abrir "Banco de Horas"
⏳ expenses → Carregar quando abrir "Despesas"
⏳ messages → Carregar quando abrir "Mensagens"
⏳ surveys → Carregar quando abrir "Clima Organizacional"
⏳ feedback → Carregar quando abrir "Feedback"
⏳ holidays → Carregar quando necessário
⏳ schedule_periods → Carregar quando necessário
⏳ locked_months → Carregar quando necessário
⏳ job_roles → Carregar quando necessário
⏳ anomaly_types → Carregar quando necessário
```

---

### **4. TIME_LOGS - Últimas 24h (não 7 dias)**

**Impacto**: Reduz volume de dados em ~85%

```typescript
// ANTES:
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);  // 7 dias

// DEPOIS:
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);  // Apenas ontem + hoje
```

**Justificação**:
- Dashboard mostra apenas HOJE
- Histórico carrega sob demanda
- Reduz queries massivas

---

### **5. CACHE COM TTL MAIS LONGO**

**Impacto**: Menos queries repetidas

```typescript
// ANTES:
const CACHE_TTL = 30000; // 30 segundos

// DEPOIS:
const CACHE_TTL = 300000; // 5 minutos (match polling)
```

---

### **6. ELIMINAR QUERIES DESNECESSÁRIAS NO REFRESH**

**Problema**: refreshData() carrega TUDO a cada 2 minutos

**Solução**: Refresh apenas dados que mudam frequentemente

```typescript
// REFRESH APENAS:
✅ time_logs (de hoje)
✅ events (próximos 7 dias)
✅ messages (últimas 20)
✅ anomalies (de hoje)

// NÃO REFRESH (dados estáticos):
❌ users (muda raramente)
❌ departments (muda raramente)
❌ locations (muda raramente)
❌ schedule_templates (muda raramente)
❌ leave_types (muda raramente)
❌ holidays (muda raramente)
❌ job_roles (muda raramente)
❌ anomaly_types (muda raramente)
```

---

## 📊 COMPARAÇÃO ANTES/DEPOIS

| Métrica | ANTES (Build #20) | DEPOIS (Build #21) | Redução |
|---------|------------------|-------------------|---------|
| **Queries no load** | 19 | 8 | **58%** ⬇️ |
| **Polling interval** | 120s | 300s | **60%** ⬇️ |
| **Queries no refresh** | 19 | 4 | **79%** ⬇️ |
| **Queries/hora/user** | 570 | 48 | **92%** ⬇️ |
| **Total (100 users)** | 57,000 | 4,800 | **92%** ⬇️ |
| **Anomalies (ADMIN)** | 500 | 100 | **80%** ⬇️ |
| **Expenses (ADMIN)** | 500 | 100 | **80%** ⬇️ |
| **Messages (ADMIN)** | 500 | 100 | **80%** ⬇️ |
| **Time_logs scope** | 7 dias | 1 dia | **85%** ⬇️ |

---

## ⚡ IMPLEMENTAÇÃO PRIORITÁRIA

### **Ordem de implementação:**

1. ✅ **URGENTE**: Polling 120s → 300s (1 linha de código)
2. ✅ **URGENTE**: time_logs 7 dias → 1 dia (1 linha)
3. ✅ **URGENTE**: Limites ADMIN 500 → 100 (6 linhas)
4. ⏳ **MÉDIO**: Lazy loading (refactor maior)
5. ⏳ **MÉDIO**: Refresh seletivo (refactor maior)
6. ⏳ **BAIXO**: Cache TTL (já tem impacto menor)

---

## 🚀 BUILD #21 - QUICK WINS

**Tempo estimado**: 5 minutos
**Impacto**: 92% redução de queries

### **Mudanças mínimas:**

```typescript
// 1. App.tsx linha ~937
const interval = setInterval(refreshData, 300000); // 5 min

// 2. App.tsx linha ~285-286
const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);  // 1 dia

// 3. App.tsx linha ~406-419 (Limites ADMIN)
if (!canViewAllRecords) anomaliesQuery = anomaliesQuery.eq('user_id', currentUser.id).limit(50);
else anomaliesQuery = anomaliesQuery.limit(100);  // -80%

if (!canViewAllRecords) hbAdjQuery = hbAdjQuery.eq('user_id', currentUser.id);
else hbAdjQuery = hbAdjQuery.limit(50);  // -90%

if (!canViewAllRecords) expensesQuery = expensesQuery.eq('user_id', currentUser.id).limit(100);
else expensesQuery = expensesQuery.limit(100);  // -80%

if (!canViewAllRecords) messagesQuery = messagesQuery.or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).limit(50);
else messagesQuery = messagesQuery.limit(100);  // -80%

// 4. App.tsx linha ~450-451 (Surveys/Feedback)
canViewAllRecords ? supabase.from('survey_responses').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
canViewAllRecords ? supabase.from('anonymous_feedback').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] })
```

---

## ✅ RESULTADO ESPERADO

**Antes**: "Your project is currently exhausting multiple resources"
**Depois**: Consumo reduzido em **92%** ✅

**Queries/hora**:
- 57,000 → 4,800 (100 users)
- **Dentro dos limites do Supabase Free Tier!**

---

**Tempo de implementação**: 5 minutos
**Build**: #21
**Deploy**: URGENTE (antes de 100 users)

