#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get Wassenger key
const { data } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'wassenger_key')
  .single();

if (!data?.value) {
  console.error('❌ No Wassenger API key found');
  process.exit(1);
}

const message = `🤖 Teste Manual - ${new Date().toLocaleTimeString('pt-PT')}

Se receberes esta mensagem:
✅ A API Wassenger funciona
✅ O problema é que o webhook não está a chegar

Testa agora enviando:
• AJUDA
• STATUS 73`;

console.log('📤 Enviando mensagem de teste...');

const response = await fetch('https://api.wassenger.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.value}`
  },
  body: JSON.stringify({
    phone: '+351911100707',
    message: message
  })
});

const result = await response.json();

if (result.id) {
  console.log('✅ Mensagem enviada com sucesso!');
  console.log('   ID:', result.id);
  console.log('   Status:', result.status);
  console.log('\n📱 Verifica o WhatsApp agora!');
} else {
  console.log('❌ Erro ao enviar:', result);
}