# 📊 MONITORIZAÇÃO - 100 COLABORADORES DIÁRIOS

**Cenário**: 100 utilizadores ativos todos os dias
**Build**: #21 (otimizado para produção)

---

## 🎯 MÉTRICAS ESPERADAS (100 USERS)

### **Queries no Supabase:**

```
┌─────────────────────────────────────────────────────────────┐
│ CARGA DIÁRIA (100 utilizadores)                            │
├─────────────────────────────────────────────────────────────┤
│ Carregamento inicial: 8 queries × 100 users = 800 queries  │
│ Refresh (5 min):      4 queries × 12/hora × 8h × 100       │
│                       = 38,400 queries/dia                   │
│ Login/Logout:         2 queries × 100 users = 200 queries  │
│ Picagens:             2 queries × 200 picagens = 400        │
│ TOTAL DIÁRIO:         ~39,800 queries/dia                   │
│ MÉDIA/HORA:           ~4,975 queries/hora (8h úteis)        │
├─────────────────────────────────────────────────────────────┤
│ LIMITE SUPABASE FREE: 500,000/mês = 16,667/dia             │
│ UTILIZAÇÃO:           39,800 / 16,667 = 239% ⚠️ PROBLEMA!  │
└─────────────────────────────────────────────────────────────┘
```

**⚠️ ATENÇÃO**: Ainda pode ultrapassar limite FREE se:
- Todos os 100 users entrarem simultaneamente
- Muitos admins a fazer refresh constante
- Múltiplos logins/logouts por dia

---

## 🚨 SINAIS DE ALERTA NO SUPABASE DASHBOARD

### **1. Database → Usage**

Verificar:
- **Queries/hora**: Deve estar < 5,000
- **Queries/dia**: Deve estar < 40,000
- **Database size**: Deve crescer <10 MB/semana

### **2. Authentication → Users**

Verificar:
- **Active users**: ~100 (consistente)
- **Failed logins**: < 5% (se > 10% = problema)
- **Sessions**: ~100 simultâneas (pico)

### **3. Logs → Edge Logs**

Procurar por:
- ❌ **Errors 500**: Problemas no servidor
- ❌ **Errors 429**: Rate limiting (too many requests)
- ❌ **Slow queries**: Queries > 1s (falta de índices)

---

## 📈 MONITORIZAÇÃO RECOMENDADA

### **DIÁRIA (1x por dia - manhã):**

```bash
✅ Ir ao Supabase Dashboard
✅ Database → Usage → Verificar queries/24h
✅ Se > 50,000 queries/dia → ALERTA!
✅ Logs → Ver se há erros recorrentes
✅ Authentication → Verificar failed logins
```

### **SEMANAL (1x por semana):**

```bash
✅ Database → Size → Verificar crescimento
✅ Database → Backups → Confirmar que estão a correr
✅ Table Editor → time_logs → Ver se está a crescer muito
✅ SQL Editor → Executar query de limpeza (se necessário)
```

### **MENSAL (1x por mês):**

```bash
✅ Analisar padrões de uso
✅ Identificar utilizadores com mais queries
✅ Limpar dados antigos (> 6 meses)
✅ Rever limites e ajustar se necessário
```

---

## 🔧 OTIMIZAÇÕES ADICIONAIS SE NECESSÁRIO

### **Se queries/hora > 6,000:**

#### **Opção 1: Aumentar polling para 10 minutos**
```typescript
// App.tsx linha 939
const interval = setInterval(refreshData, 600000); // 10 min
```
**Impacto**: 4,800 → 2,400 queries/hora (50% redução)

#### **Opção 2: Desativar refresh automático**
```typescript
// App.tsx linha 939
// const interval = setInterval(refreshData, 300000); // DESATIVAR
```
**Impacto**: 4,800 → 800 queries/hora (83% redução)
**Contrapartida**: Dados não atualizam automaticamente

#### **Opção 3: Refresh apenas para ADMINs**
```typescript
// App.tsx linha 939
if (canViewAllRecords) {
  const interval = setInterval(refreshData, 300000);
}
```
**Impacto**: Apenas ~5-10 ADMINs fazem refresh

---

## 📊 QUERIES POR TIPO DE UTILIZADOR

### **COLABORADOR (role = COLLABORATOR):**

```
Login:          8 queries (apenas seus dados)
Refresh (5min): 4 queries (apenas seus dados)
Logout:         1 query

TOTAL/DIA (8h trabalho): ~105 queries/user/dia
```

### **ADMIN (role = ADMIN):**

```
Login:          19 queries (TODOS os dados)
Refresh (5min): 15 queries (TODOS os dados)
Logout:         1 query

TOTAL/DIA (8h trabalho): ~290 queries/user/dia
```

**Conclusão**: **1 ADMIN = 3 COLLABORATORS** em termos de queries!

---

## ⚠️ CENÁRIOS DE RISCO

### **Cenário 1: 100 logins simultâneos (manhã)**

```
100 users × 8 queries = 800 queries em ~5 minutos
= 160 queries/minuto

Limite Supabase: ~8,000 queries/minuto
UTILIZAÇÃO: 160/8000 = 2% ✅ OK
```

### **Cenário 2: 10 ADMINs fazendo refresh constante**

```
10 ADMINs × 15 queries × 12 refresh/hora = 1,800 queries/hora
Apenas de ADMINs!

+ 90 Collaborators × 4 queries × 12 refresh/hora = 4,320 queries/hora

TOTAL: 6,120 queries/hora ⚠️ ATENÇÃO
```

**Solução**: Limitar refresh para ADMINs ou aumentar intervalo.

### **Cenário 3: Pico de picagens (12h-14h)**

```
100 users picam saída almoço: 100 × 2 queries = 200
100 users picam entrada almoço: 100 × 2 queries = 200

TOTAL: 400 queries em 2 horas ✅ OK (negligível)
```

---

## 🎯 LIMITES RECOMENDADOS POR PLANO

### **FREE TIER (Atual):**

```
✅ Queries/mês: 500,000
✅ Database size: 500 MB
✅ Auth users: Unlimited
✅ Bandwidth: 5 GB/mês
✅ Storage: 1 GB

COM 100 USERS (Build #21):
• Queries/mês: ~1,194,000 ❌ ULTRAPASSA 2.4x!
• Database: ~50 MB ✅ OK
• Bandwidth: ~2 GB ✅ OK
```

**⚠️ PROBLEMA**: Vais ultrapassar o FREE tier em queries!

### **PRO TIER (Recomendado para 100+ users):**

```
Custo: $25/mês
✅ Queries/mês: Unlimited
✅ Database size: 8 GB
✅ Bandwidth: 50 GB/mês
✅ Priority support
```

**Recomendação**: **UPGRADE para PRO se vais usar com 100 users diários!**

---

## 📋 QUERY DE LIMPEZA MENSAL

Execute no **SQL Editor** 1x por mês:

```sql
-- 1. Limpar time_logs antigos (> 6 meses)
DELETE FROM time_logs
WHERE date < NOW() - INTERVAL '6 months';

-- 2. Limpar anomalies antigas (> 3 meses)
DELETE FROM anomalies
WHERE created_at < NOW() - INTERVAL '3 months';

-- 3. Limpar mensagens antigas (> 6 meses)
DELETE FROM internal_messages
WHERE date < NOW() - INTERVAL '6 months';

-- 4. Limpar expenses antigas (> 1 ano)
DELETE FROM expenses
WHERE date < NOW() - INTERVAL '1 year';

-- 5. Limpar survey_responses antigas (> 6 meses)
DELETE FROM survey_responses
WHERE created_at < NOW() - INTERVAL '6 months';

-- 6. Vacuum para recuperar espaço
VACUUM ANALYZE;

-- Verificar tamanho após limpeza
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🚀 PLANO DE ESCALABILIDADE

### **100-200 users:**
✅ Build #21 + PRO tier ($25/mês)

### **200-500 users:**
✅ Build #21 + Lazy loading completo
✅ PRO tier
✅ Desativar refresh automático para collaborators

### **500-1000 users:**
✅ Team tier ($599/mês)
✅ Database read replicas
✅ CDN para assets estáticos
✅ Redis cache layer

### **1000+ users:**
✅ Enterprise tier (custom pricing)
✅ Database clustering
✅ Load balancing
✅ Microservices architecture

---

## 🔍 FERRAMENTAS DE MONITORIZAÇÃO

### **Supabase Dashboard (Nativo):**
```
✅ Database → Usage (queries, size)
✅ Logs → Edge Logs (erros)
✅ Auth → Users (active, failed)
```

### **Google Analytics (Recomendado):**
```javascript
// Adicionar ao index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### **Sentry (Errors tracking):**
```javascript
// Adicionar ao App.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

---

## ✅ CHECKLIST PRÉ-LANÇAMENTO (100 USERS)

- [ ] Build #21 deployed
- [ ] 17 índices aplicados no Supabase
- [ ] Supabase PRO tier ativado ($25/mês) ⚠️ RECOMENDADO
- [ ] Backups automáticos ativados
- [ ] Monitorização diária configurada
- [ ] Query de limpeza mensal agendada
- [ ] Documentação entregue à equipa IT
- [ ] Plano de escalabilidade definido

---

## 📞 CONTACTOS SUPORTE

**Supabase Support:**
- Email: support@supabase.com
- Discord: https://discord.supabase.com

**Upgrade para PRO:**
1. Supabase Dashboard → Settings → Billing
2. Escolher "Pro Plan" ($25/mês)
3. Confirmar pagamento

---

## 🎯 RESUMO EXECUTIVO

| Métrica | Free Tier | Com 100 users | Status |
|---------|-----------|---------------|--------|
| **Queries/mês** | 500K | ~1.2M | ❌ ULTRAPASSA |
| **Database** | 500 MB | ~50 MB | ✅ OK |
| **Bandwidth** | 5 GB | ~2 GB | ✅ OK |
| **Custo** | $0 | $25/mês (PRO) | 💰 UPGRADE |

**RECOMENDAÇÃO FINAL**:
🚨 **UPGRADE PARA PRO TIER ANTES DE LANÇAR COM 100 USERS!**

Caso contrário, Supabase pode começar a throttle/limitar queries após alguns dias de uso.

---

**Atualizado**: 2026-03-19 10:50
**Build**: #21
**Status**: ⚠️ NECESSÁRIO UPGRADE PARA PRO

