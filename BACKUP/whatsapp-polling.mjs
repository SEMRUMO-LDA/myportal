#!/usr/bin/env node

/**
 * WhatsApp Polling Service
 * Alternativa aos webhooks - verifica mensagens periodicamente
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get Wassenger API key
async function getWassengerKey() {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'wassenger_key')
    .single();
  return data?.value;
}

// Get recent messages from Wassenger
async function getRecentMessages(apiKey) {
  try {
    // Wassenger API to get messages (adjust endpoint as needed)
    const response = await fetch('https://api.wassenger.com/v1/messages?limit=10&direction=inbound', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Process command
async function processCommand(from, body) {
  const cmd = body.trim().toUpperCase();
  let response = '';

  if (cmd === 'AJUDA') {
    response = '📱 Comandos:\n• ENTRADA 73\n• SAIDA 73\n• STATUS 73';
  } else if (cmd === 'STATUS 73') {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', 73)
      .eq('date', today)
      .limit(1);

    if (data && data[0]) {
      if (data[0].check_in && !data[0].check_out) {
        response = '🟢 Presente desde ' + data[0].check_in.substring(0, 5);
      } else {
        response = '🔴 Sem registo ativo';
      }
    } else {
      response = '🔴 Sem registo hoje';
    }
  } else if (cmd === 'ENTRADA 73') {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 8);

    await supabase.from('time_logs').insert({
      user_id: 73,
      date: today,
      check_in: time,
      status: 'present'
    });

    response = '✅ Entrada registada às ' + time.substring(0, 5);
  } else if (cmd === 'SAIDA 73') {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 8);

    const { data: logs } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', 73)
      .eq('date', today)
      .is('check_out', null)
      .limit(1);

    if (logs && logs[0]) {
      await supabase
        .from('time_logs')
        .update({ check_out: time })
        .eq('id', logs[0].id);

      response = '✅ Saída registada às ' + time.substring(0, 5);
    } else {
      response = '⚠️ Sem entrada ativa';
    }
  }

  return response;
}

// Send response via Wassenger
async function sendResponse(apiKey, phone, message) {
  try {
    const response = await fetch('https://api.wassenger.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    const result = await response.json();
    console.log(`✅ Sent to ${phone}: ${message.substring(0, 30)}...`);
    return result;
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Track processed messages
const processedMessages = new Set();

// Main polling loop
async function poll() {
  const apiKey = await getWassengerKey();

  if (!apiKey) {
    console.error('❌ No Wassenger API key found');
    return;
  }

  console.log('🔍 Checking for new messages...');

  const messages = await getRecentMessages(apiKey);

  for (const msg of messages) {
    // Skip if already processed
    if (processedMessages.has(msg.id)) continue;

    // Skip outbound messages
    if (msg.direction !== 'inbound') continue;

    // Process command
    console.log(`📥 New message from ${msg.phone}: ${msg.message}`);

    const response = await processCommand(msg.phone, msg.message);

    if (response) {
      await sendResponse(apiKey, msg.phone, response);
    }

    // Mark as processed
    processedMessages.add(msg.id);

    // Clean old IDs to prevent memory leak
    if (processedMessages.size > 100) {
      const ids = Array.from(processedMessages);
      ids.slice(0, 50).forEach(id => processedMessages.delete(id));
    }
  }
}

// Start polling
console.log('🚀 WhatsApp Polling Service Started');
console.log('⏰ Checking every 10 seconds...\n');

// Poll every 10 seconds
setInterval(poll, 10000);

// Initial poll
poll();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping polling service...');
  process.exit(0);
});