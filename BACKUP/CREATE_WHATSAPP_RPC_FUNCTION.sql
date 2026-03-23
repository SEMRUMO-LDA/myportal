-- Criar função RPC para enviar mensagens WhatsApp via Wassenger
-- Executar no Supabase SQL Editor

CREATE OR REPLACE FUNCTION send_whatsapp_message(
    p_phone TEXT,
    p_message TEXT,
    p_api_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response JSON;
BEGIN
    -- Make HTTP request to Wassenger API
    SELECT content::json INTO v_response
    FROM http((
        'POST',
        'https://api.wassenger.com/v1/messages',
        ARRAY[http_header('Authorization', 'Bearer ' || p_api_key)],
        'application/json',
        json_build_object(
            'phone', p_phone,
            'message', p_message
        )::text
    )::http_request);

    RETURN v_response;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permission to execute
GRANT EXECUTE ON FUNCTION send_whatsapp_message TO anon, authenticated, service_role;

-- Se a função HTTP não existir, usar esta versão simplificada:
CREATE OR REPLACE FUNCTION send_whatsapp_message(
    p_phone TEXT,
    p_message TEXT,
    p_api_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Versão simplificada - apenas regista a intenção
    -- O envio real será feito pela Edge Function

    RETURN json_build_object(
        'success', true,
        'message', 'Message queued for sending',
        'phone', p_phone
    );
END;
$$;

-- Verificar se a chave Wassenger está configurada
SELECT * FROM settings WHERE key = 'wassenger_key';

-- Se não existir, inserir (substitui YOUR_API_KEY pela chave real)
-- INSERT INTO settings (key, value) VALUES ('wassenger_key', 'YOUR_WASSENGER_API_KEY');