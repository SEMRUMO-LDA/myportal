# 🔍 Diagnóstico: WhatsApp Não Enviado

**Data:** 22 Março 2026
**Status:** PIN resetado ✅ | WhatsApp falhou ⚠️

---

## ✅ **O Que Está a Funcionar:**

1. ✅ Service Role Key válida
2. ✅ Função SQL `send_whatsapp_message` criada
3. ✅ PIN foi gerado e atualizado no Supabase Auth
4. ✅ PIN foi atualizado na tabela `users`
5. ✅ Modal mostra "PIN Resetado!" com aviso de WhatsApp

**Conclusão:** O sistema de recuperação de PIN **FUNCIONA**! 🎉

---

## ⚠️ **O Que Falhou:**

**Mensagem mostrada:**
```
⚠️ PIN resetado com sucesso, mas houve um erro ao enviar o WhatsApp.
Comunique o novo PIN manualmente.
```

**Código:** [`PasswordRecoveryModal.tsx:118`](components/PasswordRecoveryModal.tsx#L118)

---

## 🔍 **Causas Possíveis do WhatsApp Falhar:**

### **1. Wassenger API Key Inválida/Expirada**

**Verificar:**
```sql
-- No Supabase SQL Editor
SELECT key, LEFT(value, 20) || '...' as token_preview
FROM settings
WHERE key = 'wassenger_key';
```

**Testar token:**
1. Login em https://app.wassenger.com
2. Ir para API Keys
3. Verificar se token está ativo
4. Copiar novo token se necessário

---

### **2. Função SQL Retornou Erro**

**O que aconteceu:**
- Função `send_whatsapp_message` foi chamada
- Mas retornou erro da API Wassenger

**Possíveis erros:**
- Token inválido
- Número de telefone em formato errado
- Wassenger account sem créditos
- Wassenger API temporariamente indisponível

---

### **3. Número de Telefone em Formato Errado**

**Formato esperado:**
- ✅ `+351912345678` (com +)
- ✅ `351912345678` (sem +, adiciona automaticamente)
- ✅ `912345678` (PT mobile, adiciona +351)
- ❌ `00351912345678` (formato antigo)

**Verificar número do user:**
```sql
-- Ver número do user que testaste
SELECT id, name, phone, mobile_phone
FROM users
WHERE id = 123; -- Substituir pelo ID que testaste
```

---

### **4. Wassenger Não Tem Número Associado**

**Requisito:**
- Wassenger precisa de ter um número WhatsApp Business associado
- Número deve estar verificado e ativo

**Verificar:**
1. Login em https://app.wassenger.com
2. Verificar se há dispositivo conectado
3. Verificar status: "Connected" ✅ ou "Disconnected" ❌

---

## 🔧 **Como Diagnosticar (Passo a Passo):**

### **PASSO 1: Verificar Logs do Browser**

**Abrir Console (F12 → Console) e procurar:**

```javascript
[Wassenger] ⚠️ WhatsApp send failed (non-blocking): ...
```

**Possíveis mensagens:**
- `API key não configurada` → Wassenger key missing
- `Erro desconhecido` → Wassenger API error
- `Phone invalid` → Número errado
- `Insufficient credits` → Sem créditos Wassenger

---

### **PASSO 2: Testar Wassenger Manualmente**

**No Supabase SQL Editor:**

```sql
-- Testar envio manual
SELECT send_whatsapp_message(
  '+351912345678',  -- Substituir por número real
  'Teste de mensagem',
  (SELECT value FROM settings WHERE key = 'wassenger_key')
);
```

**Output esperado:**
```json
{
  "success": true,
  "status": 200,
  "message": "Mensagem enviada com sucesso"
}
```

**Se retornar erro:**
```json
{
  "success": false,
  "error": "Invalid API token",
  "status": 401
}
```
→ Então Wassenger key está errada!

---

### **PASSO 3: Validar Wassenger Key**

**Opção A - Via Wassenger Dashboard:**
1. https://app.wassenger.com → API Keys
2. Verificar se token é válido
3. Copiar novo token
4. Atualizar no Supabase:
   ```sql
   UPDATE settings
   SET value = 'NOVO_TOKEN_AQUI'
   WHERE key = 'wassenger_key';
   ```

**Opção B - Via Supabase:**
```sql
-- Ver token atual
SELECT value FROM settings WHERE key = 'wassenger_key';
```

---

## 🚀 **Soluções Rápidas:**

### **Solução 1: Atualizar Wassenger Key**

```sql
-- No Supabase SQL Editor
UPDATE settings
SET value = 'SEU_NOVO_TOKEN_WASSENGER'
WHERE key = 'wassenger_key';
```

Depois:
1. Reiniciar `npm run dev`
2. Testar novamente recuperação PIN

---

### **Solução 2: Verificar Número de Telefone**

```sql
-- Ver e corrigir número do user
SELECT id, name, phone, mobile_phone
FROM users
WHERE id = 123; -- ID que testaste

-- Corrigir formato se necessário
UPDATE users
SET phone = '+351912345678'  -- Formato correto
WHERE id = 123;
```

---

### **Solução 3: Testar com Outro User**

Tentar recuperar PIN de outro user que tenha:
- ✅ Número de telefone válido
- ✅ auth_id preenchido
- ✅ Número no formato +351XXXXXXXXX

---

## 📊 **Checklist de Verificação WhatsApp:**

- [ ] Wassenger key configurada na tabela `settings`
- [ ] Wassenger account ativo em app.wassenger.com
- [ ] Dispositivo WhatsApp conectado no Wassenger
- [ ] User tem `phone` ou `mobile_phone` preenchido
- [ ] Número está no formato internacional (+351...)
- [ ] Wassenger tem créditos disponíveis
- [ ] Função `send_whatsapp_message` existe no Supabase
- [ ] Extensão HTTP instalada no Postgres

---

## 💡 **Alternativas (Enquanto WhatsApp Não Funciona):**

### **Opção 1: Comunicar PIN Manualmente**

O sistema já mostra esta mensagem:
```
⚠️ PIN resetado com sucesso, mas houve um erro ao enviar o WhatsApp.
Comunique o novo PIN manualmente.
```

**Como ver o PIN gerado:**
1. Abrir Console do browser (F12)
2. Procurar log:
   ```
   [PinRecovery] 🔐 New PIN generated for user 123
   ```
3. O PIN está no log (ou verificar DB):
   ```sql
   SELECT id, name, pin FROM users WHERE id = 123;
   ```

---

### **Opção 2: Usar Email em Vez de WhatsApp**

Modificar código para enviar por email:
- Usar Supabase Auth `sendPasswordResetEmail`
- Ou integrar serviço de email (SendGrid, Mailgun, etc.)

---

## 🎯 **Próximo Passo Imediato:**

**Executar este SQL para diagnosticar:**

```sql
-- 1. Ver Wassenger key
SELECT
  'Wassenger Key: ' || LEFT(value, 20) || '...' as key_preview
FROM settings
WHERE key = 'wassenger_key';

-- 2. Testar envio manual
SELECT send_whatsapp_message(
  '+351912345678',  -- SUBSTITUIR POR NÚMERO REAL
  'Teste manual de WhatsApp',
  (SELECT value FROM settings WHERE key = 'wassenger_key')
);

-- 3. Ver logs de erro (se houver)
-- Verificar console do browser para mensagem de erro exata
```

**Partilhar o resultado** deste SQL para eu te ajudar a corrigir! 🔍

---

## ✅ **Importante:**

**O sistema de recuperação de PIN FUNCIONA!** ✅

- PIN foi resetado com sucesso ✅
- User pode fazer login com novo PIN ✅
- Apenas WhatsApp falhou (não-crítico) ⚠️

**Workaround atual:**
1. Admin vê PIN no console do browser
2. Comunica manualmente ao colaborador
3. Colaborador faz login normalmente

---

**Criado por:** Claude Code
**Próximo passo:** Diagnosticar Wassenger key e testar envio manual
