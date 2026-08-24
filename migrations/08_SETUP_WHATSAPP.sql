-- ============================================================================
-- SCRIPT DE ATIVAÇÃO DO WHATSAPP (Wassenger)
-- ============================================================================

-- 1. Criar a tabela 'settings' usada pelo frontend (se não existir)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir a API Key do Wassenger fornecida
INSERT INTO settings (key, value)
VALUES ('wassenger_key', '6f958fdb8f571b0ed66c9aeaa30fdc297e27e224aa6f8368b29992a291cda552a0d4e62e8a408198')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Ativar a extensão HTTP (necessária para chamadas à API)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 4. Eliminar versão anterior da função proxy
DROP FUNCTION IF EXISTS public.send_whatsapp_message(TEXT, TEXT, TEXT);

-- 5. Recriar a função proxy para enviar a mensagem
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

-- 6. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO anon;

-- 7. Forçar atualização da cache da base de dados
NOTIFY pgrst, 'reload schema';
