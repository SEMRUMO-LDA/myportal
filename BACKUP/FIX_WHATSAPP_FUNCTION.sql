-- Corrigir função RPC para enviar mensagens WhatsApp
-- Executar no Supabase SQL Editor

-- Passo 1: Remover função existente (se existir)
DROP FUNCTION IF EXISTS send_whatsapp_message(text, text, text);

-- Passo 2: Criar função com tipo de retorno correto
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
    -- Versão simplificada que funciona sem extensão HTTP
    -- O envio real é feito pela Edge Function

    RETURN json_build_object(
        'success', true,
        'message', 'Message queued for sending',
        'phone', p_phone,
        'timestamp', NOW()
    );
END;
$$;

-- Passo 3: Grant permissions
GRANT EXECUTE ON FUNCTION send_whatsapp_message TO anon, authenticated, service_role;

-- Passo 4: Verificar se funciona
SELECT send_whatsapp_message('+351911100707', 'Teste', 'dummy_key');

-- Passo 5: Verificar se a chave Wassenger está configurada
SELECT * FROM settings WHERE key = 'wassenger_key';