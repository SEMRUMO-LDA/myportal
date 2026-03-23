# 🔍 Diagnóstico: Recuperação de PIN por WhatsApp

**Data:** 22 de Março de 2026
**Issue:** Sistema de recuperação de PIN deixou de funcionar
**Erro mostrado:** "Erro ao atualizar PIN no sistema de autenticação."

---

## 📋 Análise do Fluxo Atual

### 1️⃣ **Fluxo Esperado** (como deveria funcionar):

```
Utilizador introduz ID →
Sistema valida user →
Gera PIN aleatório (6 dígitos) →
Atualiza Supabase Auth (updateUserById) →
Atualiza tabela users (pin + requires_new_pin) →
Envia WhatsApp via Wassenger →
Sucesso ✅
```

### 2️⃣ **Componentes Envolvidos:**

1. **Frontend:** [`components/PasswordRecoveryModal.tsx`](components/PasswordRecoveryModal.tsx)
2. **Admin Client:** [`services/supabaseAdminClient.ts`](services/supabaseAdminClient.ts)
3. **WhatsApp Service:** [`services/wassengerService.ts`](services/wassengerService.ts)
4. **Database Function:** `send_whatsapp_message` (RPC)

---

## 🐛 Problemas Identificados

### ❌ **PROBLEMA #1: Função SQL não aplicada**

**Ficheiro:** [`supabase/migrations/005_create_whatsapp_proxy_function.sql`](supabase/migrations/005_create_whatsapp_proxy_function.sql)

**Status:** ⚠️ Existe na pasta `supabase/migrations/` mas **provavelmente não foi executada** no Supabase

**Evidência:**
- Código chama `supabase.rpc('send_whatsapp_message', {...})`
- Se função não existe → Erro: `42883: function send_whatsapp_message does not exist`

**Solução:**
```sql
-- Executar no Supabase SQL Editor:
-- Copiar e colar todo o conteúdo de:
-- supabase/migrations/005_create_whatsapp_proxy_function.sql
```

---

### ❌ **PROBLEMA #2: Service Key pode estar inválida**

**Ficheiro:** [`services/supabaseAdminClient.ts`](services/supabaseAdminClient.ts#L16)

**Status:** ⚠️ Warning no código:
```typescript
if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not found. Admin operations will fail.');
}
```

**Service Key atual (do .env):**
```
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Problemas potenciais:**
1. ⚠️ **Token FAKE/PLACEHOLDER** - Payload diz `"ref":"service_role"` mas pode ser um exemplo
2. ⚠️ **Token expirado** - Expira em 2084 (improvável)
3. ⚠️ **Falta permissões** - Não tem permissão `auth.admin.updateUserById()`

**Validação necessária:**
- Ir ao Supabase Dashboard → Settings → API
- Copiar **service_role key** (não anon key!)
- Substituir no `.env`

---

### ❌ **PROBLEMA #3: Wassenger API Key não configurada**

**Ficheiro:** [`services/wassengerService.ts`](services/wassengerService.ts#L41)

**Status:** ⚠️ API key vem da tabela `settings`

**Como funciona:**
```typescript
await getSetting('wassenger_key'); // Busca da DB
```

**Checklist:**
- [ ] Tabela `settings` existe no Supabase?
- [ ] Registo com `key = 'wassenger_key'` existe?
- [ ] Valor está preenchido com token válido da Wassenger?

**Como configurar:**
1. Login no Supabase → Table Editor → `settings`
2. INSERT ou UPDATE:
   ```sql
   INSERT INTO settings (key, value)
   VALUES ('wassenger_key', 'SEU_TOKEN_WASSENGER_AQUI')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```
3. Obter token em: https://app.wassenger.com/

---

### ⚠️ **PROBLEMA #4: Erro específico no screenshot**

**Erro mostrado:**
```
"Erro ao atualizar PIN no sistema de autenticação."
```

**Linha de código:** [`PasswordRecoveryModal.tsx:84`](components/PasswordRecoveryModal.tsx#L84)

```typescript
const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
  userData.auth_id,
  { password: newPin }
);

if (authError) {
  console.error('[PinRecovery] ❌ Auth update failed:', authError);
  throw new Error('Erro ao atualizar PIN no sistema de autenticação.'); // ← ESTE ERRO
}
```

**Causas possíveis:**
1. ❌ `VITE_SUPABASE_SERVICE_KEY` inválida/expirada
2. ❌ `userData.auth_id` é NULL (utilizador não migrado)
3. ❌ Supabase Auth não permite update de password
4. ❌ RLS bloqueou a operação

---

## 🔧 Plano de Correção (Passo a Passo)

### **PASSO 1: Validar Service Role Key** ✅

1. Abrir Supabase Dashboard
2. Ir a **Settings → API**
3. Copiar **service_role key** (secção "Project API keys")
4. Colar no `.env`:
   ```env
   VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.REAL_TOKEN_HERE
   ```
5. Reiniciar servidor de desenvolvimento

---

### **PASSO 2: Aplicar SQL Function** ✅

**Executar no Supabase SQL Editor:**

```sql
-- Copiar TODO o conteúdo de:
-- supabase/migrations/005_create_whatsapp_proxy_function.sql

-- Ou executar diretamente:
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

DROP FUNCTION IF EXISTS public.send_whatsapp_message(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.send_whatsapp_message(
  p_phone TEXT,
  p_message TEXT,
  p_api_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_response extensions.http_response;
  v_body JSONB;
  v_headers extensions.http_header[];
BEGIN
  -- Validações
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Número de telefone não fornecido');
  END IF;

  IF p_api_key IS NULL OR p_api_key = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'API key não configurada');
  END IF;

  -- Skip validation test messages
  IF p_message = 'VALIDATION_CHECK' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Validation OK');
  END IF;

  -- Build headers array
  v_headers := ARRAY[
    extensions.http_header('Token', p_api_key),
    extensions.http_header('Content-Type', 'application/json')
  ];

  -- Build request body
  v_body := jsonb_build_object(
    'phone', p_phone,
    'message', p_message
  );

  -- Make HTTP POST to Wassenger API
  SELECT * INTO v_response FROM extensions.http((
    'POST',
    'https://api.wassenger.com/v1/messages',
    v_headers,
    'application/json',
    v_body::text
  )::extensions.http_request);

  -- Parse response
  IF v_response.status >= 200 AND v_response.status < 300 THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_response.status,
      'message', 'Mensagem enviada com sucesso'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_response.content, 'Erro desconhecido'),
      'status', v_response.status
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro interno: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO anon;
```

---

### **PASSO 3: Configurar Wassenger API Key** ✅

**Opção A - Via SQL:**
```sql
-- Criar tabela settings se não existe
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir/atualizar Wassenger key
INSERT INTO settings (key, value)
VALUES ('wassenger_key', 'SEU_TOKEN_WASSENGER_AQUI')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

**Opção B - Via Interface (se existir página de Settings):**
1. Login como admin
2. Ir a Definições → Integrações
3. Inserir Wassenger API Key

**Obter token Wassenger:**
- https://app.wassenger.com/api-keys
- Ou contactar admin do Wassenger

---

### **PASSO 4: Verificar Migração de Utilizadores** ✅

**Validar que utilizadores têm `auth_id`:**

```sql
-- Ver utilizadores SEM auth_id (não migrados)
SELECT id, name, email, auth_id
FROM users
WHERE auth_id IS NULL
LIMIT 10;

-- Se houver utilizadores sem auth_id, precisam de ser migrados
```

**Se necessário migrar:**
- Executar script: `scripts/migrate-users-to-auth.ts`
- Ou aplicar migration manualmente

---

### **PASSO 5: Testar Recuperação** ✅

**Teste 1 - Service Key:**
```javascript
// Abrir console do browser no login
console.log('Service Key:', import.meta.env.VITE_SUPABASE_SERVICE_KEY);
// Deve mostrar eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Teste 2 - Função SQL:**
```sql
-- Executar no Supabase SQL Editor
SELECT send_whatsapp_message(
  '+351912345678',
  'Teste',
  'FAKE_KEY_FOR_TEST'
);
-- Deve retornar JSON (mesmo que com erro de auth)
```

**Teste 3 - Recuperação completa:**
1. Ir ao Login
2. Clicar "Esqueceu o PIN?"
3. Inserir ID de colaborador (ex: 123)
4. Clicar "Enviar via WhatsApp"
5. **Verificar console do browser** para erros
6. **Verificar WhatsApp** do colaborador

---

## 🎯 Checklist de Verificação

Antes de testar em produção:

- [ ] **Service Role Key válida** no `.env`
- [ ] **Função SQL aplicada** no Supabase
- [ ] **Wassenger API Key** configurada na tabela `settings`
- [ ] **Utilizadores migrados** (têm `auth_id`)
- [ ] **Console do browser limpo** (sem erros)
- [ ] **Testar com ID de teste** primeiro

---

## 📊 Logs Úteis para Debug

### Frontend (Console do Browser):
```
[PinRecovery] 🔐 New PIN generated for user 123
[PinRecovery] ✅ Supabase Auth password updated
[PinRecovery] ✅ Users table updated (pin + requires_new_pin)
[Wassenger] 🔍 Loading API key from settings...
[Wassenger] ✅ API key loaded successfully
[Wassenger] 📤 Calling RPC send_whatsapp_message...
[Wassenger] ✅ Message sent successfully
[PinRecovery] ✅ WhatsApp message sent to +351912345678
```

### Erros comuns e soluções:

| Erro | Causa | Solução |
|------|-------|---------|
| `function send_whatsapp_message does not exist` | Função SQL não aplicada | Executar PASSO 2 |
| `SUPABASE_SERVICE_KEY not found` | Variável .env falta | Adicionar ao .env |
| `Auth update failed` | Service key inválida | Obter key correta do Supabase |
| `Não existe nenhum colaborador` | ID errado ou user deleted | Verificar ID |
| `não tem um número de telemóvel` | Campo phone vazio | Adicionar phone na DB |
| `Utilizador não migrado` | auth_id é NULL | Migrar utilizador |
| `WhatsApp send failed` | API key inválida/expirada | Renovar token Wassenger |

---

## 🚀 Próximos Passos

1. ✅ Aplicar PASSO 1 (Service Key)
2. ✅ Aplicar PASSO 2 (SQL Function)
3. ✅ Aplicar PASSO 3 (Wassenger Key)
4. ✅ Testar com ID de teste
5. ✅ Validar WhatsApp recebido
6. ✅ Testar login com novo PIN
7. ✅ Documentar para futuros problemas

---

**Criado por:** Claude Code
**Versão:** 2.56.0
**Contacto:** Em caso de dúvidas, verificar logs do browser e Supabase
