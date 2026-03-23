// Supabase Edge Function - WhatsApp Webhook with Security and Geolocation
// Deploy with: supabase functions deploy whatsapp-webhook --no-verify-jwt

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
    // Log request details for debugging
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    console.log('Webhook received:', JSON.stringify(payload))

    // Only process incoming messages (Wassenger format)
    if (payload.event !== 'message:in:new') {
      console.log('Ignoring non-message event:', payload.event)
      return new Response(JSON.stringify({ status: 'ignored', event: payload.event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Extract from Wassenger format
    const fromNumber = payload.data?.fromNumber || payload.data?.from
    const body = payload.data?.body || ''
    const type = payload.data?.type
    const latitude = payload.data?.latitude || payload.data?.lat
    const longitude = payload.data?.longitude || payload.data?.lng || payload.data?.lon
    const locationName = payload.data?.locationName || payload.data?.address

    if (!fromNumber) {
      console.log('Missing fromNumber')
      return new Response(JSON.stringify({ status: 'invalid_payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Check if message has both text and location (combined message)
    if ((latitude && longitude) && body) {
      console.log('Combined message with location and text:', { body, latitude, longitude })

      // Process as a command with location directly
      const trimmedBody = body.trim().toUpperCase()

      // Clean phone number
      const cleanPhone = fromNumber.replace(/[\s+]/g, '')

      // Find user by phone
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, phone, whatsapp_enabled')
        .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},phone.eq.${fromNumber}`)
        .single()

      if (userError || !userData) {
        const response = `❌ Número não registado no sistema.`
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
        return new Response(JSON.stringify({ status: 'user_not_found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      const userId = userData.id
      const userName = userData.name
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      const timeString = now.toTimeString().split(' ')[0]

      let response = ''

      // Direct processing with location
      if (trimmedBody === 'ENTRADA') {
        const { data: existing } = await supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        if (existing?.check_in && !existing?.check_out) {
          response = `⚠️ *${userName}*
Já tem entrada às ${existing.check_in.substring(0, 5)}`
        } else {
          const clockInData = {
            check_in: timeString,
            check_out: null,
            status: 'present',
            source: 'whatsapp',
            check_in_lat: latitude,
            check_in_lng: longitude,
            check_in_location: locationName || `${latitude}, ${longitude}`,
            check_in_coordinates: `${latitude}, ${longitude}`
          }

          if (existing) {
            await supabase.from('time_logs').update(clockInData).eq('id', existing.id)
          } else {
            await supabase.from('time_logs').insert({
              user_id: userId,
              date: today,
              ...clockInData
            })
          }

          response = `✅ *${userName}*
Entrada registada às ${timeString.substring(0, 5)}
📍 Local: ${locationName || `${latitude}, ${longitude}`}`
        }
      } else if (trimmedBody === 'SAIDA') {
        const { data: existing } = await supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single()

        if (!existing?.check_in) {
          response = `⚠️ Sem entrada hoje. Use ENTRADA primeiro.`
        } else if (existing.check_out) {
          response = `⚠️ Já tem saída às ${existing.check_out.substring(0, 5)}`
        } else {
          const checkInParts = existing.check_in.split(':')
          const checkOutParts = timeString.split(':')
          const totalMinutes = (parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1])) -
                               (parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]))
          const hours = Math.floor(totalMinutes / 60)
          const minutes = totalMinutes % 60

          await supabase.from('time_logs').update({
            check_out: timeString,
            total_hours: (totalMinutes / 60).toFixed(2),
            check_out_lat: latitude,
            check_out_lng: longitude,
            check_out_location: locationName || `${latitude}, ${longitude}`,
            check_out_coordinates: `${latitude}, ${longitude}`
          }).eq('id', existing.id)

          response = `✅ *${userName}*
Saída registada às ${timeString.substring(0, 5)}
Tempo: ${hours}h${minutes}min
📍 Local: ${locationName || `${latitude}, ${longitude}`}`
        }
      } else {
        response = `📍 Localização recebida com comando: ${trimmedBody}

Use ENTRADA ou SAIDA com localização.`
      }

      // Send response
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

      return new Response(JSON.stringify({ status: 'processed_with_location' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Check if it's ONLY a location message (no text)
    if (type === 'location' || (latitude && longitude)) {
      console.log('Location-only message received:', { latitude, longitude, locationName })

      // Clean phone number (remove + and spaces)
      const cleanPhone = fromNumber.replace(/[\s+]/g, '')

      // Find user by phone
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, phone, whatsapp_enabled')
        .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},phone.eq.${fromNumber}`)
        .single()

      if (userError || !userData) {
        const response = `❌ Número não registado no sistema.

Para usar o WhatsApp Clock:
1. O seu número ${fromNumber} deve estar registado no seu perfil
2. Contacte o administrador`

        // Send response
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

        return new Response(JSON.stringify({ status: 'user_not_found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // Store location for next clock in/out
      const locationKey = `location_${userData.id}`
      const locationData = {
        latitude,
        longitude,
        locationName,
        timestamp: new Date().toISOString()
      }

      // Store in temporary storage (valid for 5 minutes)
      await supabase
        .from('settings')
        .upsert({
          key: locationKey,
          value: JSON.stringify(locationData),
          updated_at: new Date().toISOString()
        })

      const response = `📍 *Localização recebida!*

Coordenadas: ${latitude}, ${longitude}
${locationName ? `Local: ${locationName}` : ''}

Agora envie o comando:
• *ENTRADA* - Para registar entrada
• *SAIDA* - Para registar saída

📱 A localização será registada com a sua próxima picagem.`

      // Send response
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

      return new Response(JSON.stringify({ status: 'location_stored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Process text messages
    if (!body) {
      console.log('No body in message')
      return new Response(JSON.stringify({ status: 'no_body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const trimmedBody = body.trim().toUpperCase()
    console.log('Processing command:', trimmedBody, 'from:', fromNumber)

    // Parse command
    let response = ''

    // AJUDA command - always available
    if (trimmedBody === 'AJUDA' || trimmedBody === 'HELP') {
      response = `📱 *Comandos disponíveis:*

*LINK* - Receber o seu link pessoal de picagem
*STATUS* - Ver o seu estado (não precisa localização)
*ENTRADA* - Registar entrada (⚠️ localização obrigatória)
*SAIDA* - Registar saída (⚠️ localização obrigatória)
*AJUDA* - Ver comandos

📍 *LOCALIZAÇÃO OBRIGATÓRIA para picagem:*
1. Clique no 📎 (anexo)
2. Escolha 📍 Localização
3. Envie localização atual
4. Envie o comando (ENTRADA ou SAIDA)

💡 *Dica:* Use o comando LINK para obter o seu link pessoal e guardar nos favoritos!`
    }
    // Commands that require user identification by phone
    else if (trimmedBody === 'STATUS' || trimmedBody === 'ENTRADA' || trimmedBody === 'SAIDA' || trimmedBody === 'LINK') {
      // Clean phone number (remove + and spaces)
      const cleanPhone = fromNumber.replace(/[\s+]/g, '')

      console.log('Looking up user with phone:', cleanPhone)

      // Find user by phone
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, phone, whatsapp_enabled')
        .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},phone.eq.${fromNumber}`)
        .single()

      if (userError || !userData) {
        console.log('User not found for phone:', cleanPhone)
        response = `❌ Número não registado no sistema.

Para usar o WhatsApp Clock:
1. O seu número ${fromNumber} deve estar registado no seu perfil
2. Contacte o administrador para adicionar o número

📞 Formato aceite: ${cleanPhone}`
      } else if (userData.whatsapp_enabled === false) {
        response = `⚠️ WhatsApp desativado para o seu perfil.

Contacte o administrador para ativar esta funcionalidade.`
      } else {
        // User found - process command with their ID
        const userId = userData.id
        const userName = userData.name
        console.log(`User identified: ${userName} (ID: ${userId})`)

        // Check for stored location
        const locationKey = `location_${userId}`
        const { data: locationSettings } = await supabase
          .from('settings')
          .select('value, updated_at')
          .eq('key', locationKey)
          .single()

        let locationData = null
        if (locationSettings) {
          const locationAge = Date.now() - new Date(locationSettings.updated_at).getTime()
          // Location is valid for 5 minutes
          if (locationAge < 5 * 60 * 1000) {
            locationData = JSON.parse(locationSettings.value)
            console.log('Using stored location:', locationData)
          }
        }

        if (trimmedBody === 'LINK') {
          // Generate permanent link for the user
          const token = Buffer.from(`${userId}-${userData.phone}`).toString('base64');
          const baseUrl = 'https://semrumo.eu/app/myportal';
          const clockUrl = `${baseUrl}/clock-geo.html?phone=${encodeURIComponent(userData.phone)}&token=${token}&name=${encodeURIComponent(userName)}`;

          response = `🔗 *O seu link pessoal de picagem:*

${clockUrl}

📱 *Como usar:*
1. Clique no link acima
2. Adicione aos favoritos ⭐
3. Ou adicione ao ecrã inicial 📲
4. Use sempre que precisar!

✅ *Vantagens do link:*
• GPS automático
• Funciona sem WhatsApp
• Acesso rápido
• Link permanente (nunca muda)

💡 *Dica:* Guarde este link no seu telemóvel para acesso rápido!`
        } else if (trimmedBody === 'STATUS') {
          const today = new Date().toISOString().split('T')[0]
          const { data, error } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .single()

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching status:', error)
            response = `❌ Erro ao verificar estado`
          } else if (data?.check_in && !data?.check_out) {
            const checkInTime = data.check_in.substring(0, 5) // HH:MM
            response = `📊 *${userName}*
🟢 Presente desde ${checkInTime}
${data.check_in_lat ? `📍 Local: ${data.check_in_location || `${data.check_in_lat}, ${data.check_in_lng}`}` : ''}`
          } else if (data?.check_out) {
            const checkOutTime = data.check_out.substring(0, 5) // HH:MM
            response = `📊 *${userName}*
🔴 Saída às ${checkOutTime}
${data.check_out_lat ? `📍 Local saída: ${data.check_out_location || `${data.check_out_lat}, ${data.check_out_lng}`}` : ''}`
          } else {
            response = `📊 *${userName}*
🔴 Sem registo hoje`
          }
        } else if (trimmedBody === 'ENTRADA') {
          // CHECK FOR MANDATORY LOCATION
          if (!locationData) {
            response = `📍 *Localização obrigatória!*

Para registar ENTRADA, deve primeiro:
1. Clicar no 📎 (anexo)
2. Escolher 📍 Localização
3. Enviar localização atual
4. Depois enviar ENTRADA

⚠️ A localização é obrigatória para controlo de presença.`

            // Send response and exit
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

            return new Response(JSON.stringify({ status: 'location_required' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            })
          }
          const today = new Date().toISOString().split('T')[0]
          const now = new Date()
          const timeString = now.toTimeString().split(' ')[0] // HH:MM:SS

          // Check existing
          const { data: existing, error: fetchError } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching existing:', fetchError)
            response = `❌ Erro ao verificar entrada`
          } else if (existing?.check_in && !existing?.check_out) {
            const checkInTime = existing.check_in.substring(0, 5) // HH:MM
            response = `⚠️ *${userName}*
Já tem entrada às ${checkInTime}`
          } else {
            // Register clock in with location if available
            const clockInData: any = {
              check_in: timeString,
              check_out: null,
              status: 'present',
              source: 'whatsapp'
            }

            if (locationData) {
              clockInData.check_in_lat = locationData.latitude
              clockInData.check_in_lng = locationData.longitude
              clockInData.check_in_location = locationData.locationName || `${locationData.latitude}, ${locationData.longitude}`
              clockInData.check_in_coordinates = `${locationData.latitude}, ${locationData.longitude}`
            }

            let insertError = null
            if (existing) {
              const { error } = await supabase
                .from('time_logs')
                .update(clockInData)
                .eq('id', existing.id)
              insertError = error
            } else {
              const { error } = await supabase
                .from('time_logs')
                .insert({
                  user_id: userId,
                  date: today,
                  ...clockInData
                })
              insertError = error
            }

            if (insertError) {
              console.error('Error inserting entry:', insertError)
              response = `❌ Erro ao registar entrada`
            } else {
              response = `✅ *${userName}*
Entrada registada às ${timeString.substring(0, 5)}
📍 Local: ${locationData.locationName || `${locationData.latitude}, ${locationData.longitude}`}`

              // Clear stored location after use
                await supabase
                  .from('settings')
                  .delete()
                  .eq('key', locationKey)
              }
            }
          } else if (trimmedBody === 'SAIDA') {
          // CHECK FOR MANDATORY LOCATION
          if (!locationData) {
            response = `📍 *Localização obrigatória!*

Para registar SAÍDA, deve primeiro:
1. Clicar no 📎 (anexo)
2. Escolher 📍 Localização
3. Enviar localização atual
4. Depois enviar SAIDA

⚠️ A localização é obrigatória para controlo de presença.`

            // Send response and exit
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

            return new Response(JSON.stringify({ status: 'location_required' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            })
          }

          const today = new Date().toISOString().split('T')[0]
          const now = new Date()
          const timeString = now.toTimeString().split(' ')[0] // HH:MM:SS

          const { data: existing, error: fetchError } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching for exit:', fetchError)
            response = `❌ Erro ao verificar saída`
          } else if (!existing?.check_in) {
            response = `⚠️ *${userName}*
Sem entrada hoje. Use ENTRADA primeiro.`
          } else if (existing.check_out) {
            const checkOutTime = existing.check_out.substring(0, 5) // HH:MM
            response = `⚠️ *${userName}*
Já tem saída às ${checkOutTime}`
          } else {
            // Calculate hours
            const checkInParts = existing.check_in.split(':')
            const checkOutParts = timeString.split(':')
            const checkInMinutes = parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1])
            const checkOutMinutes = parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1])
            const totalMinutes = checkOutMinutes - checkInMinutes
            const hours = Math.floor(totalMinutes / 60)
            const minutes = totalMinutes % 60
            const totalHours = (totalMinutes / 60).toFixed(2)

            // Prepare update with location if available
            const updateData: any = {
              check_out: timeString,
              total_hours: parseFloat(totalHours)
            }

            if (locationData) {
              updateData.check_out_lat = locationData.latitude
              updateData.check_out_lng = locationData.longitude
              updateData.check_out_location = locationData.locationName || `${locationData.latitude}, ${locationData.longitude}`
              updateData.check_out_coordinates = `${locationData.latitude}, ${locationData.longitude}`
            }

            const { error: updateError } = await supabase
              .from('time_logs')
              .update(updateData)
              .eq('id', existing.id)

            if (updateError) {
              console.error('Error updating exit:', updateError)
              response = `❌ Erro ao registar saída`
            } else {
              response = `✅ *${userName}*
Saída registada às ${timeString.substring(0, 5)}
Tempo: ${hours}h${minutes}min
📍 Local: ${locationData.locationName || `${locationData.latitude}, ${locationData.longitude}`}`

              // Clear stored location after use
                await supabase
                  .from('settings')
                  .delete()
                  .eq('key', locationKey)
              }
            }
          }
        }
      }
    // Legacy commands with ID (for backwards compatibility - but with validation)
    else if (trimmedBody.startsWith('STATUS ') || trimmedBody.startsWith('ENTRADA ') || trimmedBody.startsWith('SAIDA ')) {
      const parts = trimmedBody.split(' ')
      const command = parts[0]
      const requestedId = parseInt(parts[1])

      if (isNaN(requestedId)) {
        response = `❌ ID inválido.

🔒 *Novo sistema de segurança ativo!*
Use os comandos sem ID:
• ENTRADA
• SAIDA
• STATUS

📍 *Com geolocalização:*
1. Envie a sua localização
2. Envie o comando

O sistema identifica-o automaticamente pelo número WhatsApp.`
      } else {
        // Check if the phone number belongs to the requested ID
        const cleanPhone = fromNumber.replace(/[\s+]/g, '')

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, phone')
          .eq('id', requestedId)
          .single()

        if (userError || !userData) {
          response = `❌ Utilizador ${requestedId} não encontrado`
        } else {
          // Verify phone matches
          const userPhone = userData.phone?.replace(/[\s+]/g, '')

          if (userPhone !== cleanPhone && `+${userPhone}` !== fromNumber && userPhone !== fromNumber) {
            response = `🔒 *Acesso negado*

Por segurança, só pode fazer picagem com o seu próprio ID.

Use os comandos sem ID:
• ENTRADA (regista a sua entrada)
• SAIDA (regista a sua saída)
• STATUS (vê o seu estado)`
          } else {
            // Phone matches - allow the operation
            response = `ℹ️ *Comando legacy detetado*

Por favor, use os novos comandos sem ID:
• ENTRADA (em vez de ENTRADA ${requestedId})
• SAIDA (em vez de SAIDA ${requestedId})
• STATUS (em vez de STATUS ${requestedId})

📍 *Nova funcionalidade:*
Envie a sua localização antes do comando para registar o local.`
          }
        }
      }
    } else {
      response = `❓ Comando não reconhecido.

*Comandos disponíveis:*
• ENTRADA - Registar entrada
• SAIDA - Registar saída
• STATUS - Ver estado
• AJUDA - Ver esta mensagem

📍 *Com geolocalização:*
1. Envie a sua localização (📍)
2. Envie o comando desejado`
    }

    console.log('Response message:', response)

    // Send WhatsApp response via Wassenger
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wassenger_key')
      .single()

    if (settings?.value) {
      console.log('Sending WhatsApp response to:', fromNumber)
      const { error: sendError } = await supabase.rpc('send_whatsapp_message', {
        p_phone: fromNumber,
        p_message: response,
        p_api_key: settings.value
      })

      if (sendError) {
        console.error('Error sending WhatsApp:', sendError)
      } else {
        console.log('WhatsApp response sent successfully')
      }
    } else {
      console.log('No Wassenger API key configured')
    }

    // Always return 200 to acknowledge webhook
    return new Response(JSON.stringify({
      status: 'processed',
      response,
      from: fromNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
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