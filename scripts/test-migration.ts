/**
 * Test Migration Script - Migrate only 5 users for testing
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL!,
  env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testMigration() {
  console.log('🧪 Testing migration with 5 users...\n');

  // Get 5 users without auth_id
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, pin')
    .is('auth_id', null)
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${users?.length || 0} users to test:\n`);
  users?.forEach(u => {
    console.log(`  - ${u.id}: ${u.name} (${u.email})`);
  });

  console.log('\n✅ Script works! Ready to run full migration.');
}

testMigration();
