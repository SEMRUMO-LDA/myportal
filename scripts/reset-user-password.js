/**
 * Reset a user's password in Supabase Auth
 * Use this to set a known PIN for testing
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

// Get user ID and new password from command line
const userId = process.argv[2];
const newPassword = process.argv[3] || '1234';

if (!userId) {
  console.log('Usage: node reset-user-password.js <user_id> [password]');
  console.log('Example: node reset-user-password.js 73 1234');
  process.exit(1);
}

async function resetPassword() {
  console.log(`🔐 Resetting password for user ${userId}...`);
  console.log(`New password: ${newPassword}`);
  console.log('');

  // Get user from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, auth_id')
    .eq('id', parseInt(userId))
    .single();

  if (userError || !user) {
    console.log('❌ User not found');
    return;
  }

  if (!user.auth_id) {
    console.log('❌ User not migrated to Supabase Auth yet');
    return;
  }

  console.log(`Found user: ${user.name} (${user.email})`);
  console.log(`Auth ID: ${user.auth_id}`);
  console.log('');

  // Update password in Supabase Auth
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.auth_id,
    { password: newPassword }
  );

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('✅ Password updated successfully!');
  console.log('');
  console.log('You can now login with:');
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: ${newPassword}`);
}

resetPassword();
