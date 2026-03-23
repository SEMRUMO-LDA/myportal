-- ============================================================
-- FUNÇÃO: send_whatsapp_message
-- DESCRIÇÃO: Proxy para enviar mensagens WhatsApp via Wassenger API
-- NECESSÁRIO: Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Ativar a extensão HTTP (necessária para chamadas à API)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Eliminar versão anterior (necessário para alterar tipo de retorno)
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

-- 3. Permissões de acesso
GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_whatsapp_message(TEXT, TEXT, TEXT) TO anon;

-- 4. Comentário
COMMENT ON FUNCTION public.send_whatsapp_message IS 'Proxy para enviar mensagens WhatsApp via Wassenger API. Evita problemas de CORS no frontend.';
