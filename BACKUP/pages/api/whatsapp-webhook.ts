/**
 * WhatsApp Webhook Endpoint for Next.js/Vercel
 * Receives and processes WhatsApp clock commands
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Wassenger service configuration
const WASSENGER_API_KEY = process.env.WASSENGER_API_KEY || '';
const WASSENGER_WEBHOOK_SECRET = process.env.WASSENGER_WEBHOOK_SECRET || '';

// Command patterns
const COMMANDS = {
    ENTRADA: /^(entrada|in|e)\s+(\d+)(?:\s+(\d{4,6}))?$/i,
    SAIDA: /^(saida|out|s)\s+(\d+)(?:\s+(\d{4,6}))?$/i,
    STATUS: /^(status|estado)\s+(\d+)$/i,
    AJUDA: /^(ajuda|help|h)$/i
};

interface WassengerWebhookPayload {
    event: 'message:in:new' | 'message:out:new' | 'message:update';
    data: {
        id: string;
        from: string;
        to: string;
        body: string;
        timestamp: string;
        type: 'text' | 'image' | 'document' | 'audio' | 'video';
    };
    device?: {
        id: string;
        phone: string;
    };
}

// Send WhatsApp response
async function sendWhatsAppMessage(phone: string, message: string) {
    try {
        // Call Supabase RPC function to send WhatsApp
        const { data, error } = await supabase.rpc('send_whatsapp_message', {
            p_phone: phone,
            p_message: message,
            p_api_key: WASSENGER_API_KEY || (await getWassengerKey())
        });

        if (error) {
            console.error('[WhatsApp] Failed to send message:', error);
            return false;
        }

        console.log('[WhatsApp] Message sent successfully');
        return true;
    } catch (error) {
        console.error('[WhatsApp] Error sending message:', error);
        return false;
    }
}

// Get Wassenger API key from settings
async function getWassengerKey() {
    const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'wassenger_key')
        .single();

    return data?.value || '';
}

// Parse command from message
function parseCommand(body: string) {
    const trimmedBody = body.trim();

    for (const [commandName, pattern] of Object.entries(COMMANDS)) {
        const match = trimmedBody.match(pattern);
        if (match) {
            switch (commandName) {
                case 'ENTRADA':
                    return { type: 'clock_in', userId: parseInt(match[2]), pin: match[3] };
                case 'SAIDA':
                    return { type: 'clock_out', userId: parseInt(match[2]), pin: match[3] };
                case 'STATUS':
                    return { type: 'status', userId: parseInt(match[2]) };
                case 'AJUDA':
                    return { type: 'help' };
            }
        }
    }

    return { type: 'unknown' };
}

// Get user by phone number
async function getUserByPhone(phone: string) {
    const normalizedPhone = phone.replace(/[\s+]/g, '');
    const phoneVariants = [
        normalizedPhone,
        normalizedPhone.replace(/^351/, ''),
        '351' + normalizedPhone.replace(/^351/, ''),
        normalizedPhone.substring(normalizedPhone.length - 9)
    ];

    const { data } = await supabase
        .from('users')
        .select('*')
        .or(phoneVariants.map(p => `phone.ilike.%${p}`).join(','))
        .limit(1)
        .single();

    return data;
}

// Process clock in
async function processClockIn(userId: number, userName: string) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if already clocked in
    const { data: existing } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    if (existing?.check_in && !existing?.check_out) {
        return `⚠️ Já tem entrada registada hoje às ${new Date(existing.check_in).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Register clock in
    if (existing) {
        await supabase
            .from('time_logs')
            .update({ check_in: now, check_out: null, updated_at: now })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('time_logs')
            .insert({
                user_id: userId,
                date: today,
                check_in: now,
                status: 'present',
                created_at: now,
                updated_at: now
            });
    }

    return `✅ *Entrada registada com sucesso!*\n\n` +
           `👤 ${userName}\n` +
           `📅 ${new Date().toLocaleDateString('pt-PT')}\n` +
           `⏰ ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}\n\n` +
           `Tenha um excelente dia de trabalho! 💪`;
}

// Process clock out
async function processClockOut(userId: number, userName: string) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Get today's entry
    const { data: existing } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    if (!existing?.check_in) {
        return `⚠️ Não tem entrada registada hoje. Use ENTRADA ${userId} primeiro.`;
    }

    if (existing.check_out) {
        return `⚠️ Já tem saída registada hoje às ${new Date(existing.check_out).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Calculate hours worked
    const checkIn = new Date(existing.check_in);
    const checkOut = new Date();
    const diff = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const totalHours = (diff / 3600000).toFixed(2);

    // Register clock out
    await supabase
        .from('time_logs')
        .update({
            check_out: now,
            total_hours: totalHours,
            updated_at: now
        })
        .eq('id', existing.id);

    return `✅ *Saída registada com sucesso!*\n\n` +
           `👤 ${userName}\n` +
           `📅 ${new Date().toLocaleDateString('pt-PT')}\n` +
           `⏰ ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}\n` +
           `⏱️ Horas trabalhadas: ${hours}h${minutes.toString().padStart(2, '0')}\n\n` +
           `Bom descanso! 🏠`;
}

// Process status
async function processStatus(userId: number, userName: string) {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    let status = '🔴 Sem registo hoje';
    let lastAction = 'N/A';
    let hoursToday = '0h00';

    if (data) {
        if (data.check_in && !data.check_out) {
            status = '🟢 Presente';
            lastAction = new Date(data.check_in).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

            // Calculate hours until now
            const diff = Date.now() - new Date(data.check_in).getTime();
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            hoursToday = `${hours}h${minutes.toString().padStart(2, '0')}`;
        } else if (data.check_out) {
            status = '🔴 Saída registada';
            lastAction = new Date(data.check_out).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            hoursToday = `${parseFloat(data.total_hours || '0').toFixed(2)}h`;
        }
    }

    return `📊 *Estado atual*\n\n` +
           `👤 ${userName}\n` +
           `📅 ${new Date().toLocaleDateString('pt-PT')}\n` +
           `🔄 Estado: ${status}\n` +
           `⏰ Última ação: ${lastAction}\n` +
           `⏱️ Horas hoje: ${hoursToday}`;
}

// Main webhook handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('[WhatsApp Webhook] Received:', JSON.stringify(req.body));

        const payload = req.body as WassengerWebhookPayload;

        // Only process incoming text messages
        if (payload.event !== 'message:in:new' || payload.data.type !== 'text') {
            return res.status(200).json({ status: 'ignored' });
        }

        const { from, body } = payload.data;
        const command = parseCommand(body);

        console.log('[WhatsApp Webhook] Command:', command);

        let response = '';

        // Process commands
        if (command.type === 'help') {
            response = `📱 *Comandos disponíveis:*\n\n` +
                      `*ENTRADA* <id> - Registar entrada\n` +
                      `*SAIDA* <id> - Registar saída\n` +
                      `*STATUS* <id> - Ver estado atual\n` +
                      `*AJUDA* - Ver esta mensagem\n\n` +
                      `📝 *Exemplos:*\n` +
                      `• ENTRADA 73\n` +
                      `• SAIDA 73\n` +
                      `• STATUS 73`;
        } else if (command.type === 'unknown') {
            response = `❓ Comando não reconhecido.\n\nDigite *AJUDA* para ver os comandos disponíveis.`;
        } else if (command.userId) {
            // Get user
            const user = await getUserByPhone(from);

            if (!user) {
                response = `📵 Este número não está registado.\n\nContacte os RH para associar o seu número.`;
            } else if (user.id !== command.userId) {
                response = `🔒 Só pode registar picagens com o seu próprio ID (${user.id}).`;
            } else {
                // Process the command
                switch (command.type) {
                    case 'clock_in':
                        response = await processClockIn(user.id, user.name);
                        break;
                    case 'clock_out':
                        response = await processClockOut(user.id, user.name);
                        break;
                    case 'status':
                        response = await processStatus(user.id, user.name);
                        break;
                    default:
                        response = '❓ Comando não implementado.';
                }
            }
        } else {
            response = '❌ ID de utilizador inválido.';
        }

        // Send response
        console.log('[WhatsApp Webhook] Sending response:', response.substring(0, 100));
        await sendWhatsAppMessage(from, response);

        // Log attempt
        if (command.userId) {
            await supabase
                .from('whatsapp_clock_logs')
                .insert({
                    user_id: command.userId,
                    phone: from,
                    action: command.type,
                    result: 'processed',
                    message_id: payload.data.id,
                    message_body: body.substring(0, 100),
                    created_at: new Date().toISOString()
                });
        }

        res.status(200).json({ status: 'processed' });

    } catch (error) {
        console.error('[WhatsApp Webhook] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}