
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()

    if (payload.event !== 'message:in:new') {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { from, body } = payload.data
    const cmd = body.trim().toUpperCase()
    let response = ''

    if (cmd === 'AJUDA') {
      response = '📱 Comandos:\n• ENTRADA 73\n• SAIDA 73\n• STATUS 73\n• AJUDA'
    } else if (cmd.startsWith('STATUS ')) {
      const id = parseInt(cmd.split(' ')[1])
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', id)
        .eq('date', today)
        .single()

      if (data?.check_in && !data?.check_out) {
        response = '🟢 Presente'
      } else if (data?.check_out) {
        response = '🔴 Saída registada'
      } else {
        response = '🔴 Sem registo hoje'
      }
    } else if (cmd.startsWith('ENTRADA ')) {
      const id = parseInt(cmd.split(' ')[1])
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      const { data: existing } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', id)
        .eq('date', today)
        .single()

      if (existing?.check_in && !existing?.check_out) {
        response = '⚠️ Já tem entrada registada'
      } else {
        if (existing) {
          await supabase.from('time_logs').update({ check_in: now }).eq('id', existing.id)
        } else {
          await supabase.from('time_logs').insert({ user_id: id, date: today, check_in: now, status: 'present' })
        }
        response = '✅ Entrada registada'
      }
    } else if (cmd.startsWith('SAIDA ')) {
      const id = parseInt(cmd.split(' ')[1])
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      const { data: existing } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', id)
        .eq('date', today)
        .single()

      if (!existing?.check_in) {
        response = '⚠️ Sem entrada hoje'
      } else if (existing.check_out) {
        response = '⚠️ Já tem saída registada'
      } else {
        const hours = ((Date.now() - new Date(existing.check_in).getTime()) / 3600000).toFixed(1)
        await supabase.from('time_logs').update({ check_out: now, total_hours: hours }).eq('id', existing.id)
        response = '✅ Saída registada. Horas: ' + hours + 'h'
      }
    } else {
      response = '❓ Comando não reconhecido'
    }

    // Send response
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wassenger_key')
      .single()

    if (settings?.value) {
      await supabase.rpc('send_whatsapp_message', {
        p_phone: from,
        p_message: response,
        p_api_key: settings.value
      })
    }

    return new Response(JSON.stringify({ status: 'ok', response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
