import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

// Create Supabase client with service role key
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const DEFAULT_PASSWORD = '123456';
const BATCH_SIZE = 10; // Process 10 users at a time to avoid rate limits

async function resetAllPasswords() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   RESET ALL PASSWORDS TO 123456           ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  try {
    // Get all users with auth_id
    console.log('📥 Fetching all migrated users...');
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, auth_id')
      .not('auth_id', 'is', null)
      .order('id');

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No migrated users found!');
      return;
    }

    console.log(`✅ Found ${users.length} migrated users`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(users.length / BATCH_SIZE);

      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} users)`);
      console.log('─'.repeat(50));

      for (const user of batch) {
        try {
          // Reset password in Supabase Auth
          const { error: authError } = await supabase.auth.admin.updateUserById(
            user.auth_id,
            { password: DEFAULT_PASSWORD }
          );

          if (authError) {
            errorCount++;
            errors.push({ user: user.email, error: authError.message });
            console.log(`  ❌ [${user.id}] ${user.name} - ${authError.message}`);
          } else {
            successCount++;
            console.log(`  ✅ [${user.id}] ${user.name}`);
          }

        } catch (err) {
          errorCount++;
          errors.push({ user: user.email, error: err.message });
          console.log(`  ❌ [${user.id}] ${user.name} - ${err.message}`);
        }
      }

      console.log('');

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Summary
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║            RESET COMPLETE                  ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 SUMMARY');
    console.log('──────────');
    console.log(`Total users: ${users.length}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('');
    console.log(`🔑 Default password: ${DEFAULT_PASSWORD}`);
    console.log('');

    if (errors.length > 0) {
      console.log('⚠️  ERRORS:');
      errors.forEach(e => {
        console.log(`   - ${e.user}: ${e.error}`);
      });
      console.log('');
    }

    if (successCount === users.length) {
      console.log('🎉 All users successfully reset!');
      console.log('');
      console.log('ℹ️  Next steps:');
      console.log('   1. All users can now login with PIN: 123456');
      console.log('   2. They will be forced to create a new PIN on first login');
      console.log('   3. Test login with your account to verify');
      console.log('');
    }

  } catch (error) {
    console.error('');
    console.error('💥 FATAL ERROR:', error.message);
    console.error('');
  }
}

// Run the script
resetAllPasswords();
