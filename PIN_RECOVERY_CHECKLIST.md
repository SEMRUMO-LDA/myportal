# ✅ Checklist: Configuração PIN Recovery

**Atualizado:** 22 de Março de 2026, 20:30

---

## 📋 Status da Configuração

### ✅ **1. Service Role Key**
**Status:** ✅ CONFIGURADO (2026-03-22 20:30)

- ✅ Key obtida do Supabase Dashboard
- ✅ Adicionada ao `.env` (linhas 9-10)
- ✅ Key válida (expira em 2084)
- ⚠️ **PRÓXIMO PASSO:** Reiniciar servidor para aplicar

**Comando:**
```bash
# Parar servidor atual (Ctrl+C)
npm run dev
```

---

### ⏳ **2. Função SQL `send_whatsapp_message`**
**Status:** ⚠️ PENDENTE - Precisa ser aplicada

**O que fazer:**
1. Abrir Supabase Dashboard
2. Ir para **SQL Editor**
3. Clicar "New Query"
4. **Copiar e colar** o SQL abaixo:

<details>
<summary>📄 Clique para ver o SQL completo</summary>

```sql
-- ============================================================
-- FUNÇÃO: send_whatsapp_message
-- DESCRIÇÃO: Proxy para enviar mensagens WhatsApp via Wassenger API
-- ============================================================

-- 1. Ativar a extensão HTTP
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Eliminar versão anterior
DROP FUNCTION IF EXISTS public.send_whatsapp_message(TEXT, TEXT, TEXT);

-- 3. Criar a função proxy
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

  -- Build headers
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

-- 4. Permissões
GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO anon;
```

</details>

5. Clicar **RUN** (ou pressionar Ctrl+Enter)
6. Deve aparecer: "Success. No rows returned"

**Tempo estimado:** 2 minutos

---

### ⏳ **3. Wassenger API Key**
**Status:** ⚠️ PENDENTE - Precisa ser configurada

**O que fazer:**
1. Obter token da Wassenger:
   - Login em https://app.wassenger.com
   - Ir para API Keys / Settings
   - Copiar o token

2. No Supabase SQL Editor, executar:

```sql
-- Criar tabela settings (se não existe)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir/atualizar Wassenger key
INSERT INTO settings (key, value)
VALUES ('wassenger_key', 'COLAR_TOKEN_WASSENGER_AQUI')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

3. Substituir `COLAR_TOKEN_WASSENGER_AQUI` pelo token real

**Tempo estimado:** 2 minutos

---

### ⏳ **4. Verificar Migração de Utilizadores**
**Status:** ⚠️ DESCONHECIDO - Precisa verificar

**O que fazer:**

No Supabase SQL Editor, executar:

```sql
-- Ver quantos users têm auth_id
SELECT
  COUNT(*) FILTER (WHERE auth_id IS NOT NULL) as migrated,
  COUNT(*) FILTER (WHERE auth_id IS NULL) as not_migrated,
  COUNT(*) as total
FROM users;
```

**Se `not_migrated > 0`:**
- Executar script de migração:
  ```bash
  npx tsx scripts/migrate-users-to-auth.ts
  ```

**Tempo estimado:** 1 minuto (verificação) + 5-10 min (migração se necessário)

---

## 🧪 Teste Automatizado

Depois de completar os passos 1-4, executar:

```bash
npx tsx scripts/test-pin-recovery-config.ts
```

**Output esperado:**
```
✅ Service Key: Service key valid (found X users)
✅ WhatsApp Function: Function exists and responds correctly
✅ Wassenger Config: Wassenger key configured (abc123...)
✅ User Migration: All X users migrated to Supabase Auth
✅ Phone Numbers: X users have phone numbers configured

Summary: 5 PASS | 0 FAIL | 0 WARN
✅ PIN Recovery is fully configured and ready!
```

---

## 🎯 Teste Real de Recuperação

Depois de tudo configurado:

1. **Abrir aplicação** (npm run dev)
2. **Ir ao Login**
3. **Clicar "Esqueceu o PIN?"**
4. **Inserir ID de colaborador** (ex: 123)
5. **Clicar "Enviar via WhatsApp"**

**Verificar:**
- ✅ Console do browser (F12) mostra:
  ```
  [PinRecovery] 🔐 New PIN generated for user 123
  [PinRecovery] ✅ Supabase Auth password updated
  [PinRecovery] ✅ Users table updated
  [Wassenger] ✅ Message sent successfully
  ```
- ✅ Modal mostra "Mensagem Enviada!"
- ✅ WhatsApp recebido pelo colaborador
- ✅ Login funciona com novo PIN

---

## 📊 Progresso Atual

| Passo | Status | Tempo | Responsável |
|-------|--------|-------|-------------|
| 1. Service Key | ✅ FEITO | 0 min | Claude Code |
| 2. SQL Function | ⏳ PENDENTE | 2 min | Admin |
| 3. Wassenger Key | ⏳ PENDENTE | 2 min | Admin |
| 4. User Migration | ⏳ PENDENTE | 1 min | Admin |
| 5. Teste | ⏳ PENDENTE | 2 min | Admin |

**Próximo passo:** Reiniciar servidor + Aplicar SQL (Passo 2)

---

## 🆘 Ajuda

**Se tiver problemas:**
- Ver [`SOLUCAO_RAPIDA_PIN_RECOVERY.md`](SOLUCAO_RAPIDA_PIN_RECOVERY.md)
- Ver [`DIAGNOSTICO_PIN_RECOVERY.md`](DIAGNOSTICO_PIN_RECOVERY.md)
- Executar `npx tsx scripts/test-pin-recovery-config.ts`

**Logs úteis:**
- Console do browser (F12 → Console)
- Supabase Dashboard → Logs → Postgres Logs

---

**Atualizado:** 22 Março 2026, 20:30
**Próximo passo:** Reiniciar `npm run dev` e aplicar SQL function
