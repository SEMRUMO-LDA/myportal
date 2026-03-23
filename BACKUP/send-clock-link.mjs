#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get Wassenger API key
const { data: settings } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'wassenger_key')
  .single();

if (!settings?.value) {
  console.log('❌ No Wassenger API key found');
  process.exit(1);
}

const API_KEY = settings.value;

// Função para enviar link de picagem
async function sendClockLink(phone, userName = '') {
  console.log('📱 Sending clock link to:', phone);

  // Gerar token único para segurança
  const token = Math.random().toString(36).substring(2, 15);

  // URL da PWA
  // const baseUrl = 'https://semrumo.eu/app/myportal';
  // Para teste local:
  const baseUrl = 'http://localhost:3000/app/myportal'

  const clockUrl = `${baseUrl}/clock-geo.html?phone=${encodeURIComponent(phone)}&token=${token}`;

  const message = `🕐 *Sistema de Picagem Rápida*

Olá${userName ? ' ' + userName : ''}! Clique no link abaixo para registar entrada/saída com localização automática:

🔗 ${clockUrl}

✅ *Vantagens:*
• GPS automático
• Um clique apenas
• Sem complicações

📍 O link captura a localização automaticamente e permite escolher ENTRADA ou SAÍDA.

_Este link é pessoal e intransmissível_`;

  try {
    const response = await fetch('https://api.wassenger.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    const result = await response.json();

    if (result.id) {
      console.log('✅ Link sent successfully!');
      console.log('   Message ID:', result.id);
      console.log('   Clock URL:', clockUrl);
      return { success: true, url: clockUrl, messageId: result.id };
    } else {
      console.log('❌ Error:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.log('❌ Error sending link:', error.message);
    return { success: false, error: error.message };
  }
}

// Enviar para múltiplos utilizadores
async function sendToAllUsers() {
  console.log('📬 Sending clock links to all users with WhatsApp enabled...\n');

  const { data: users } = await supabase
    .from('users')
    .select('id, name, phone, whatsapp_enabled')
    .eq('whatsapp_enabled', true)
    .not('phone', 'is', null);

  if (!users || users.length === 0) {
    console.log('No users found with WhatsApp enabled');
    return;
  }

  console.log(`Found ${users.length} users with WhatsApp enabled\n`);

  for (const user of users) {
    console.log(`Sending to ${user.name} (${user.phone})...`);
    const result = await sendClockLink(user.phone, user.name);

    if (result.success) {
      console.log(`✅ Sent to ${user.name}\n`);
    } else {
      console.log(`❌ Failed to send to ${user.name}\n`);
    }

    // Aguardar 2 segundos entre envios para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('✅ All links sent!');
}

// Menu de opções
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('🕐 WhatsApp Clock Link Sender\n');
  console.log('Usage:');
  console.log('  node send-clock-link.mjs <phone>       - Send to specific phone');
  console.log('  node send-clock-link.mjs --all         - Send to all users');
  console.log('  node send-clock-link.mjs --test        - Send test to admin\n');
  console.log('Examples:');
  console.log('  node send-clock-link.mjs +351911100707');
  console.log('  node send-clock-link.mjs --all\n');
} else if (args[0] === '--all') {
  await sendToAllUsers();
} else if (args[0] === '--test') {
  await sendClockLink('+351911100707', 'Tiago');
} else {
  // Enviar para número específico
  const phone = args[0];
  const name = args[1] || '';
  await sendClockLink(phone, name);
}