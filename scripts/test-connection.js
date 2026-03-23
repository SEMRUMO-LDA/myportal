/**
 * Simple connection test (JavaScript, not TypeScript)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

console.log('🔍 Testing Supabase connection...\n');
console.log('URL:', env.VITE_SUPABASE_URL);
console.log('Service Key:', env.SUPABASE_SERVICE_KEY ? `${env.SUPABASE_SERVICE_KEY.substring(0, 20)}...` : 'MISSING');
console.log('');

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function test() {
  try {
    console.log('📊 Counting users without auth_id...');

    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .is('auth_id', null);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log(`✅ Found ${count} users without auth_id`);
    console.log('\n✅ Connection successful!');

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

test();
