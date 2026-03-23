# 🚀 Solução Rápida: Recuperação de PIN não funciona

**Problema:** Erro ao recuperar PIN via WhatsApp
**Erro mostrado:** "Erro ao atualizar PIN no sistema de autenticação"

---

## ⚡ Solução em 3 Passos (5 minutos)

### **PASSO 1: Obter Service Role Key do Supabase** ⏱️ 2 min

1. Abrir https://supabase.com/dashboard
2. Selecionar projeto "imfhacvrivasciftaujm"
3. Ir a **Settings** (⚙️) → **API**
4. Na secção "Project API keys", copiar **`service_role`** (NÃO o `anon`!)
5. Abrir ficheiro `.env` no projeto
6. Substituir linha:
   ```env
   VITE_SUPABASE_SERVICE_KEY=COLAR_AQUI_A_CHAVE_COPIADA
   ```
7. **Reiniciar servidor de desenvolvimento** (`npm run dev`)

---

### **PASSO 2: Aplicar Função SQL** ⏱️ 2 min

1. Abrir Supabase Dashboard → **SQL Editor**
2. Clicar "New Query"
3. **Copiar e colar** este SQL:

```sql
-- CRIAR FUNÇÃO WHATSAPP (se já existe, vai substituir)
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
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Número de telefone não fornecido');
  END IF;

  IF p_api_key IS NULL OR p_api_key = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'API key não configurada');
  END IF;

  IF p_message = 'VALIDATION_CHECK' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Validation OK');
  END IF;

  v_headers := ARRAY[
    extensions.http_header('Token', p_api_key),
    extensions.http_header('Content-Type', 'application/json')
  ];

  v_body := jsonb_build_object(
    'phone', p_phone,
    'message', p_message
  );

  SELECT * INTO v_response FROM extensions.http((
    'POST',
    'https://api.wassenger.com/v1/messages',
    v_headers,
    'application/json',
    v_body::text
  )::extensions.http_request);

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

4. Clicar **RUN** (ou Ctrl+Enter)
5. Deve aparecer: `Success. No rows returned`

---

### **PASSO 3: Configurar Wassenger API Key** ⏱️ 1 min

**Opção A - Via SQL (mais rápido):**

1. No SQL Editor, executar:
```sql
-- CRIAR TABELA SETTINGS (se não existe)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERIR/ATUALIZAR WASSENGER KEY
INSERT INTO settings (key, value)
VALUES ('wassenger_key', 'COLAR_AQUI_TOKEN_WASSENGER')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

2. Substituir `COLAR_AQUI_TOKEN_WASSENGER` pelo token real da Wassenger

**Obter token Wassenger:**
- Login em https://app.wassenger.com
- Ir a API Keys ou Settings
- Copiar token

---

## ✅ Verificação Rápida

**Testar configuração:**
```bash
npm run test-pin-recovery
```

Ou manualmente:

1. Abrir console do browser (F12)
2. Ir ao Login → "Esqueceu o PIN?"
3. Inserir ID de teste
4. Verificar logs no console:
   - ✅ `[PinRecovery] ✅ Supabase Auth password updated`
   - ✅ `[Wassenger] ✅ Message sent successfully`

---

## 🐛 Troubleshooting

### Erro: "Chave de administração inválida"
- ❌ Service key errada no `.env`
- ✅ **Solução:** Repetir PASSO 1, garantir que copiou `service_role` e NÃO `anon`

### Erro: "function send_whatsapp_message does not exist"
- ❌ SQL não foi aplicado
- ✅ **Solução:** Repetir PASSO 2

### Erro: "API key não configurada"
- ❌ Wassenger key não está na DB
- ✅ **Solução:** Repetir PASSO 3

### Erro: "Utilizador não migrado"
- ❌ User não tem `auth_id`
- ✅ **Solução:** Executar migration:
  ```bash
  npx tsx scripts/migrate-users-to-auth.ts
  ```

### WhatsApp não enviado mas PIN resetado
- ⚠️ PIN foi atualizado mas WhatsApp falhou
- ✅ **Solução:** Comunicar PIN manualmente ao colaborador
- ✅ Verificar se Wassenger key está correta

---

## 📊 Checklist Final

Antes de considerar resolvido:

- [ ] Service key adicionada ao `.env`
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Função SQL aplicada no Supabase
- [ ] Wassenger key configurada na tabela `settings`
- [ ] Teste com ID real funcionou
- [ ] WhatsApp recebido pelo colaborador
- [ ] Login com novo PIN funciona

---

## 📞 Suporte

**Se ainda não funcionar:**

1. Executar diagnóstico completo:
   ```bash
   npx tsx scripts/test-pin-recovery-config.ts
   ```

2. Verificar [`DIAGNOSTICO_PIN_RECOVERY.md`](DIAGNOSTICO_PIN_RECOVERY.md) para análise detalhada

3. Verificar logs do browser (F12 → Console) durante o teste

4. Verificar logs do Supabase:
   - Dashboard → Logs → Postgres Logs
   - Procurar erros relacionados com `send_whatsapp_message`

---

**Tempo total:** ~5 minutos
**Dificuldade:** Fácil
**Requer:** Acesso admin ao Supabase Dashboard
