# 🚨 SOLUÇÃO URGENTE - PROBLEMA RLS

**PROBLEMA IDENTIFICADO:** Row Level Security (RLS) do Supabase está a bloquear TODAS as queries!

---

## 🎯 SOLUÇÃO IMEDIATA (5 minutos)

### PASSO 1: Ir ao Supabase

1. Abrir: https://supabase.com/dashboard
2. Login
3. Selecionar projeto: **imfhacvrivasciftaujm**

### PASSO 2: Executar SQL

1. Clicar em **"SQL Editor"** (menu esquerdo)
2. Clicar em **"New Query"**
3. **COPIAR E COLAR** isto:

```sql
-- DESATIVAR RLS EM TODAS AS TABELAS
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
```

4. Clicar em **"RUN"** (ou F5)

### PASSO 3: Testar App

1. No Safari, ir para: `https://semrumo.eu/app/myportal/`
2. Limpar cache: **Cmd + Option + E**
3. Reload: **Cmd + R**
4. **DEVE FUNCIONAR AGORA!**

---

## ✅ O QUE DEVE ACONTECER

Após desativar RLS:

✅ Login aparece sem erros
✅ Sem erros vermelhos na Consola
✅ Login funciona (ID: 69, PIN: 123456)
✅ Portal carrega normalmente
✅ Clock in/out funciona

---

## 🔒 REATIVAR RLS DEPOIS (Segurança)

**IMPORTANTE:** Após confirmar que funciona, reativar RLS com policies corretas.

Ficheiro criado: `FIX_RLS_SUPABASE.sql`

Executar a parte comentada (depois de testar).

---

## 📊 VERIFICAR SE FUNCIONOU

Na Consola do Safari (após desativar RLS):

**ANTES (com RLS):**
```
❌ Fetch API cannot load ... due to access control checks
❌ Fetch API cannot load ... due to access control checks
❌ Fetch API cannot load ... due to access control checks
```

**DEPOIS (sem RLS):**
```
✅ [App] Starting data fetch...
✅ [App] Users loaded successfully
✅ Sem erros vermelhos!
```

---

## 🚀 RESUMO

1. **Executar SQL** no Supabase (desativa RLS)
2. **Limpar cache** do browser
3. **Reload** da página
4. **FUNCIONA!**

**TEMPO TOTAL: 2 MINUTOS**

---

## ⚠️ NOTA DE SEGURANÇA

Desativar RLS é **temporário** para testar.

Depois de confirmar que funciona:
- Reativar RLS
- Aplicar policies corretas (ficheiro `FIX_RLS_SUPABASE.sql`)

Mas **PRIMEIRO** confirme que funciona sem RLS!

---

**VÁ AGORA AO SUPABASE E EXECUTE O SQL!** 🚀
