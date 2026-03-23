/**
 * Fix emails with accents - normalize them
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function normalizeEmail(email) {
  return email
    .trim() // Remove leading/trailing whitespace
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase();
}

async function fixEmails() {
  console.log('🔧 Fixing emails with accents...\n');

  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  let fixedCount = 0;

  for (const user of users) {
    const normalized = normalizeEmail(user.email);

    if (normalized !== user.email) {
      console.log(`📝 ${user.name}`);
      console.log(`   Old: ${user.email}`);
      console.log(`   New: ${normalized}`);

      const { error: updateError } = await supabase
        .from('users')
        .update({ email: normalized })
        .eq('id', user.id);

      if (updateError) {
        console.log(`   ❌ Failed: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated`);
        fixedCount++;
      }

      console.log('');
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} emails`);
}

fixEmails();
