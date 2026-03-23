# 🚀 EXECUTAR AGORA - Recuperação de PIN

**Data:** 22 Março 2026
**Status:** Pronto para executar passos 2, 3 e 4

---

## ✅ **PASSO 1: COMPLETO**
Service Role Key já está configurada no `.env`

---

## 📝 **PASSO 2: Aplicar Função SQL** ⏱️ 2 minutos

### **O Que Fazer:**

1. **Abrir Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/imfhacvrivasciftaujm/sql

2. **No SQL Editor:**
   - Clicar "New Query"

3. **Copiar ficheiro:**
   - Abrir: [`PASSO_2_SQL_FUNCTION.sql`](PASSO_2_SQL_FUNCTION.sql)
   - Selecionar TUDO (Ctrl+A)
   - Copiar (Ctrl+C)

4. **Colar no SQL Editor:**
   - Colar (Ctrl+V)

5. **Executar:**
   - Clicar **RUN** (botão verde)
   - Ou pressionar **Ctrl+Enter**

6. **Verificar sucesso:**
   - Deve aparecer: ✅ "Success. No rows returned"
   - Ou: ✅ "Success" com mensagens de NOTICE

### **Em Caso de Erro:**
- Se aparecer "extension http does not exist":
  - É normal, a função cria automaticamente
- Se aparecer "permission denied":
  - Verificar se está logado como owner do projeto

---

## 📝 **PASSO 3: Configurar Wassenger** ⏱️ 3 minutos

### **3.1 - Obter Token Wassenger:**

1. **Login no Wassenger:**
   - URL: https://app.wassenger.com

2. **Ir para API Keys:**
   - Menu lateral → API Keys
   - Ou Settings → API

3. **Copiar Token:**
   - Clicar "Copy" ou selecionar e copiar
   - Token deve começar com algo como `wa_...` ou similar

### **3.2 - Aplicar no Supabase:**

1. **Abrir ficheiro:**
   - Abrir: [`PASSO_3_WASSENGER_CONFIG.sql`](PASSO_3_WASSENGER_CONFIG.sql)

2. **Substituir token:**
   - Procurar linha: `VALUES ('wassenger_key', 'COLAR_SEU_TOKEN_WASSENGER_AQUI')`
   - Substituir `COLAR_SEU_TOKEN_WASSENGER_AQUI` pelo token copiado
   - Exemplo: `VALUES ('wassenger_key', 'wa_abc123xyz...')`

3. **Copiar TUDO:**
   - Selecionar tudo (Ctrl+A)
   - Copiar (Ctrl+C)

4. **No Supabase SQL Editor:**
   - New Query
   - Colar (Ctrl+V)
   - Clicar **RUN**

5. **Verificar sucesso:**
   - Deve aparecer: ✅ "Success" ou "INSERT 0 1"

---

## 📝 **PASSO 4: Verificação Completa** ⏱️ 1 minuto

### **Opção A - Verificação SQL (Recomendado):**

1. **Copiar ficheiro:**
   - Abrir: [`PASSO_4_VERIFICACAO.sql`](PASSO_4_VERIFICACAO.sql)
   - Copiar TUDO

2. **No Supabase SQL Editor:**
   - New Query
   - Colar
   - Clicar **RUN**

3. **Ler output:**
   - Deve mostrar vários ✅ verdes
   - Se aparecer ❌ vermelho, corrigir o problema indicado

### **Opção B - Teste Automático (Alternativa):**

No terminal do projeto:

```bash
# Executar script de teste
npx tsx scripts/test-pin-recovery-config.ts
```

**Output esperado:**
```
✅ Service Key: Service key valid (found X users)
✅ WhatsApp Function: Function exists and responds correctly
✅ Wassenger Config: Wassenger key configured
✅ User Migration: All X users migrated
✅ Phone Numbers: X users have phone numbers

Summary: 5 PASS | 0 FAIL | 0 WARN
✅ PIN Recovery is fully configured and ready!
```

---

## 🧪 **PASSO 5: Teste Real** ⏱️ 2 minutos

Depois de completar passos 2, 3 e 4:

1. **Reiniciar servidor:**
   ```bash
   # Parar (Ctrl+C)
   npm run dev
   ```

2. **Abrir aplicação:**
   - Ir ao Login

3. **Testar recuperação:**
   - Clicar "Esqueceu o PIN?"
   - Inserir ID de colaborador real (ex: 123)
   - Clicar "Enviar via WhatsApp"

4. **Verificar sucesso:**
   - ✅ Modal mostra "Mensagem Enviada!"
   - ✅ Console (F12) mostra logs de sucesso
   - ✅ WhatsApp recebido pelo colaborador

5. **Testar login:**
   - Voltar ao login
   - Inserir ID + novo PIN recebido
   - Login deve funcionar
   - Sistema pede para criar novo PIN personalizado

---

## 📋 **Checklist Rápido**

Antes de começar, garantir que tens:

- [ ] Acesso ao Supabase Dashboard
- [ ] Acesso ao Wassenger (para obter token)
- [ ] Projeto aberto no VS Code / editor
- [ ] Terminal aberto na pasta do projeto

---

## 🆘 **Troubleshooting**

### **Erro: "function send_whatsapp_message does not exist"**
- ❌ Não executaste PASSO 2
- ✅ Executar [`PASSO_2_SQL_FUNCTION.sql`](PASSO_2_SQL_FUNCTION.sql)

### **Erro: "API key não configurada"**
- ❌ Não executaste PASSO 3 ou esqueceste de substituir o token
- ✅ Executar [`PASSO_3_WASSENGER_CONFIG.sql`](PASSO_3_WASSENGER_CONFIG.sql) com token real

### **Erro: "Utilizador não migrado"**
- ❌ User não tem `auth_id`
- ✅ Executar: `npx tsx scripts/migrate-users-to-auth.ts`

### **WhatsApp não enviado mas PIN foi resetado**
- ⚠️ Wassenger pode ter erro
- ✅ Verificar token Wassenger
- ✅ Comunicar PIN manualmente ao colaborador

---

## 📊 **Ordem de Execução**

```
1. ✅ Service Key (JÁ FEITO)
     ↓
2. ⏳ PASSO_2_SQL_FUNCTION.sql (2 min)
     ↓
3. ⏳ PASSO_3_WASSENGER_CONFIG.sql (3 min)
     ↓
4. ⏳ PASSO_4_VERIFICACAO.sql (1 min)
     ↓
5. ⏳ Teste Real (2 min)
     ↓
6. ✅ DONE!
```

**Tempo total:** ~8 minutos

---

## 📁 **Ficheiros Criados para Ti**

- [`PASSO_2_SQL_FUNCTION.sql`](PASSO_2_SQL_FUNCTION.sql) - Criar função WhatsApp
- [`PASSO_3_WASSENGER_CONFIG.sql`](PASSO_3_WASSENGER_CONFIG.sql) - Configurar API key
- [`PASSO_4_VERIFICACAO.sql`](PASSO_4_VERIFICACAO.sql) - Verificar tudo
- [`scripts/test-pin-recovery-config.ts`](scripts/test-pin-recovery-config.ts) - Teste automático

---

## 🎯 **Próximo Passo IMEDIATO**

1. Abrir Supabase Dashboard: https://supabase.com/dashboard/project/imfhacvrivasciftaujm/sql
2. Executar [`PASSO_2_SQL_FUNCTION.sql`](PASSO_2_SQL_FUNCTION.sql)
3. Depois executar [`PASSO_3_WASSENGER_CONFIG.sql`](PASSO_3_WASSENGER_CONFIG.sql) (com token real)
4. Verificar com [`PASSO_4_VERIFICACAO.sql`](PASSO_4_VERIFICACAO.sql)

**BOA SORTE! 🚀**
