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

// MÉTODO 1: Enviar mensagem com botões interativos
async function sendInteractiveLocationRequest(phone) {
  console.log('📍 Sending interactive location request to:', phone);

  const response = await fetch('https://api.wassenger.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      phone: phone,
      message: `🕐 *Registo de Ponto*\n\nPor favor, partilhe a sua localização para registar entrada:`,
      // Botões interativos que abrem diretamente o compartilhamento de localização
      quickReply: {
        buttons: [
          {
            id: 'share_location',
            text: '📍 Partilhar Localização'
          }
        ]
      },
      // Alternativa: usar call-to-action
      callToAction: {
        buttons: [
          {
            type: 'location_request',
            text: 'Enviar Localização GPS'
          }
        ]
      }
    })
  });

  const result = await response.json();
  console.log('Response:', result);
}

// MÉTODO 2: Template Message com Location Request
async function sendTemplateWithLocation(phone) {
  console.log('📱 Sending template with location request...');

  const response = await fetch('https://api.wassenger.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      phone: phone,
      template: {
        name: 'clock_in_location',
        language: {
          code: 'pt_PT'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'location',
                location: {
                  latitude: 41.1579,
                  longitude: -8.6291,
                  name: 'SEMRUMO',
                  address: 'Porto, Portugal'
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: 'entrada'
              }
            ]
          }
        ]
      }
    })
  });

  const result = await response.json();
  console.log('Template response:', result);
}

// MÉTODO 3: Lista Interativa com opções
async function sendInteractiveList(phone) {
  console.log('📋 Sending interactive list...');

  const response = await fetch('https://api.wassenger.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      phone: phone,
      // Lista interativa
      list: {
        header: 'Registo de Ponto',
        body: 'Escolha uma opção:',
        footer: 'Sistema de Picagem SEMRUMO',
        button: 'Ver Opções',
        sections: [
          {
            title: 'Ações Rápidas',
            rows: [
              {
                id: 'clock_in',
                title: '✅ Registar Entrada',
                description: 'Com localização GPS'
              },
              {
                id: 'clock_out',
                title: '🚪 Registar Saída',
                description: 'Com localização GPS'
              },
              {
                id: 'status',
                title: '📊 Ver Estado',
                description: 'Estado atual'
              }
            ]
          }
        ]
      }
    })
  });

  const result = await response.json();
  console.log('List response:', result);
}

// MÉTODO 4: Botão de URL com PWA
async function sendPWALink(phone) {
  console.log('🌐 Sending PWA link...');

  // Gerar token único
  const token = Math.random().toString(36).substring(7);

  const response = await fetch('https://api.wassenger.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      phone: phone,
      message: `🕐 *Clique para registar ponto com localização automática:*`,
      buttons: [
        {
          type: 'url',
          text: '📍 Registar Entrada',
          url: `https://semrumo.eu/clock/in?token=${token}&phone=${phone}`
        },
        {
          type: 'url',
          text: '🚪 Registar Saída',
          url: `https://semrumo.eu/clock/out?token=${token}&phone=${phone}`
        }
      ]
    })
  });

  const result = await response.json();
  console.log('PWA link response:', result);
}

// Testar todos os métodos
const TEST_PHONE = '+351911100707';

console.log('🧪 Testing WhatsApp Location Methods\n');
console.log('=====================================\n');

// Teste 1: Interactive buttons
await sendInteractiveLocationRequest(TEST_PHONE);

// Aguardar 2 segundos
await new Promise(resolve => setTimeout(resolve, 2000));

// Teste 2: Interactive list
await sendInteractiveList(TEST_PHONE);

// Aguardar 2 segundos
await new Promise(resolve => setTimeout(resolve, 2000));

// Teste 3: PWA Link
await sendPWALink(TEST_PHONE);

console.log('\n✅ Tests completed!');
console.log('\n📱 Check your WhatsApp for the different message types');
console.log('\n💡 The method that works best depends on your Wassenger plan');