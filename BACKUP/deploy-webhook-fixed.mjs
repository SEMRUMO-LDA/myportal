#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

console.log('🚀 Deploying WhatsApp Webhook Edge Function...\n');

// The Edge Function code - no JWT verification
const functionCode = `
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // No authentication check - accept all webhooks
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    console.log('Webhook received:', JSON.stringify(payload))

    // Only process incoming messages (Wassenger format)
    if (payload.event !== 'message:in:new') {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Extract from Wassenger format
    const fromNumber = payload.data?.fromNumber || payload.data?.from
    const body = payload.data?.body

    if (!fromNumber || !body) {
      return new Response(JSON.stringify({ status: 'invalid_payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const trimmedBody = body.trim().toUpperCase()
    let response = ''

    if (trimmedBody === 'AJUDA' || trimmedBody === 'HELP') {
      response = \`📱 *Comandos disponíveis:*

*ENTRADA* <id> - Registar entrada
*SAIDA* <id> - Registar saída
*STATUS* <id> - Ver estado
*AJUDA* - Ver comandos

📝 Exemplos:
• ENTRADA 73
• SAIDA 73
• STATUS 73\`
    } else if (trimmedBody.startsWith('STATUS ')) {
      const userId = parseInt(trimmedBody.split(' ')[1])

      if (isNaN(userId)) {
        response = '❌ ID inválido. Use: STATUS <número>'
      } else {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        if (data?.check_in && !data?.check_out) {
          const checkInTime = data.check_in.substring(0, 5)
          response = \`📊 Estado: 🟢 Presente desde \${checkInTime}\`
        } else if (data?.check_out) {
          const checkOutTime = data.check_out.substring(0, 5)
          response = \`📊 Estado: 🔴 Saída às \${checkOutTime}\`
        } else {
          response = '📊 Estado: 🔴 Sem registo hoje'
        }
      }
    } else if (trimmedBody.startsWith('ENTRADA ')) {
      const userId = parseInt(trimmedBody.split(' ')[1])

      if (isNaN(userId)) {
        response = '❌ ID inválido. Use: ENTRADA <número>'
      } else {
        const today = new Date().toISOString().split('T')[0]
        const now = new Date()
        const timeString = now.toTimeString().split(' ')[0]

        const { data: existing } = await supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        if (existing?.check_in && !existing?.check_out) {
          const checkInTime = existing.check_in.substring(0, 5)
          response = \`⚠️ Já tem entrada às \${checkInTime}\`
        } else {
          if (existing) {
            await supabase
              .from('time_logs')
              .update({
                check_in: timeString,
                check_out: null,
                status: 'present'
              })
              .eq('id', existing.id)
          } else {
            await supabase
              .from('time_logs')
              .insert({
                user_id: userId,
                date: today,
                check_in: timeString,
                status: 'present'
              })
          }
          response = \`✅ Entrada registada às \${timeString.substring(0, 5)}\`
        }
      }
    } else if (trimmedBody.startsWith('SAIDA ')) {
      const userId = parseInt(trimmedBody.split(' ')[1])

      if (isNaN(userId)) {
        response = '❌ ID inválido. Use: SAIDA <número>'
      } else {
        const today = new Date().toISOString().split('T')[0]
        const now = new Date()
        const timeString = now.toTimeString().split(' ')[0]

        const { data: existing } = await supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        if (!existing?.check_in) {
          response = \`⚠️ Sem entrada hoje. Use ENTRADA \${userId} primeiro.\`
        } else if (existing.check_out) {
          const checkOutTime = existing.check_out.substring(0, 5)
          response = \`⚠️ Já tem saída às \${checkOutTime}\`
        } else {
          const checkInParts = existing.check_in.split(':')
          const checkOutParts = timeString.split(':')
          const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1])
          const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1])
          const totalMinutes = checkOutMinutes - checkInMinutes
          const hours = Math.floor(totalMinutes / 60)
          const minutes = totalMinutes % 60
          const totalHours = (totalMinutes / 60).toFixed(2)

          await supabase
            .from('time_logs')
            .update({
              check_out: timeString,
              total_hours: parseFloat(totalHours)
            })
            .eq('id', existing.id)

          response = \`✅ Saída registada às \${timeString.substring(0, 5)}. Tempo: \${hours}h\${minutes}min\`
        }
      }
    } else {
      response = '❓ Comando não reconhecido. Digite AJUDA para ver comandos.'
    }

    // Send WhatsApp response
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wassenger_key')
      .single()

    if (settings?.value) {
      await supabase.rpc('send_whatsapp_message', {
        p_phone: fromNumber,
        p_message: response,
        p_api_key: settings.value
      })
    }

    // Always return 200
    return new Response(JSON.stringify({
      status: 'processed',
      response,
      from: fromNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error:', error)
    // Still return 200 to prevent retries
    return new Response(JSON.stringify({
      error: error.message,
      status: 'error'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
`.trim();

// Instructions for manual deployment
console.log('📝 Edge Function Code Prepared\n');
console.log('Since automatic deployment isn\'t working, please deploy manually:\n');
console.log('1. Go to Supabase Dashboard > Edge Functions');
console.log('2. Click "New Function"');
console.log('3. Name it: whatsapp-webhook');
console.log('4. Replace the code with the content from:');
console.log('   supabase/functions/whatsapp-webhook/index.ts\n');
console.log('5. In the function settings, DISABLE "Verify JWT" option');
console.log('6. Deploy the function\n');
console.log('7. The webhook URL will be:');
console.log(`   ${SUPABASE_URL}/functions/v1/whatsapp-webhook\n`);

// Also test that the RPC function exists
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('🔍 Checking if RPC function exists...');
const { error: rpcError } = await supabase.rpc('send_whatsapp_message', {
  p_phone: '+1234567890',
  p_message: 'TEST',
  p_api_key: 'test'
});

if (rpcError && rpcError.code === '42883') {
  console.log('❌ RPC function send_whatsapp_message not found!');
  console.log('   Run the SQL from CREATE_WHATSAPP_RPC_FUNCTION.sql in Supabase SQL Editor');
} else {
  console.log('✅ RPC function send_whatsapp_message exists');
}

console.log('\n📱 Test the webhook by sending one of these messages to your WhatsApp:');
console.log('   AJUDA');
console.log('   STATUS 73');
console.log('   ENTRADA 73');
console.log('   SAIDA 73');