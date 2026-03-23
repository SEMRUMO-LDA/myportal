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
  console.log('❌ No API key found in settings');
  process.exit(1);
}

console.log('🔑 Testing Wassenger API key...\n');

// Test 1: Basic API test
console.log('Test 1: Sending Test Message');
const testResponse = await fetch('https://api.wassenger.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.value}`
  },
  body: JSON.stringify({
    phone: '+351911100707',
    message: '🔑 Teste de API Key - ' + new Date().toTimeString().substring(0,5)
  })
});

if (testResponse.status === 401) {
  console.log('❌ API Key is INVALID or EXPIRED!');
  console.log('   Status: 401 Unauthorized');
  console.log('\n🔧 Solution:');
  console.log('   1. Go to Wassenger dashboard');
  console.log('   2. Generate new API key');
  console.log('   3. Update in Supabase settings table');
} else if (testResponse.status === 403) {
  console.log('❌ API Key has NO PERMISSIONS!');
  console.log('   Status: 403 Forbidden');
  console.log('\n🔧 Solution:');
  console.log('   Check API key permissions in Wassenger');
} else if (testResponse.ok) {
  const result = await testResponse.json();
  console.log('✅ API Key is VALID and WORKING!');
  console.log('   Message ID:', result.id);
  console.log('   Status:', result.status);
  console.log('\n📱 Check WhatsApp for test message!');
} else {
  console.log('⚠️  Unexpected response:', testResponse.status);
  const error = await testResponse.text();
  console.log('   Error:', error);
}

// Test 2: Check webhook configuration via API
console.log('\n\nTest 2: Checking Webhook Configuration');
const headers = {
  'Authorization': `Bearer ${data.value}`
};

// Try different endpoints
const endpoints = [
  'https://api.wassenger.com/v1/webhooks',
  'https://api.wassenger.com/v1/webhook',
  'https://api.wassenger.com/v1/settings/webhooks'
];

for (const endpoint of endpoints) {
  try {
    const response = await fetch(endpoint, { headers });
    if (response.ok) {
      console.log(`✅ Found webhooks at: ${endpoint}`);
      const data = await response.json();
      console.log('   Response:', JSON.stringify(data).substring(0, 100));
      break;
    }
  } catch (error) {
    // Silent fail, try next
  }
}

console.log('\n📝 Summary:');
console.log('   API Key ends with: ****' + data.value.slice(-4));
console.log('   If messages are sent but webhooks don\'t arrive,');
console.log('   the problem is NOT the API key!');