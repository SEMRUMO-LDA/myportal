/**
 * Batch Migration - Migrate users in small batches
 * Usage: node scripts/migrate-batch.js [batch_size]
 * Example: node scripts/migrate-batch.js 10
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

// Load .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const batchSize = parseInt(process.argv[2]) || 10;

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function migrateBatch() {
  console.log(`🚀 Starting batch migration (${batchSize} users)...\n`);

  // Get users without auth_id
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, name, email, pin')
    .is('auth_id', null)
    .order('id')
    .limit(batchSize);

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log('✅ No users to migrate!');
    return;
  }

  console.log(`📊 Found ${users.length} users to migrate\n`);
  console.log('─'.repeat(60));

  const results = [];
  let successCount = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = `[${i + 1}/${users.length}]`;

    console.log(`\n${progress} ${user.name} (${user.email})`);

    try {
      // Use PIN as password or generate temp
      const password = user.pin || `TEMP${user.id}${Math.random().toString(36).slice(2, 8)}`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          app_user_id: user.id,
          name: user.name
        }
      });

      if (authError) {
        // Check if already exists
        if (authError.message.includes('already')) {
          console.log('  ℹ️  Already exists, finding...');

          const { data: list } = await supabase.auth.admin.listUsers();
          const existing = list?.users.find(u => u.email === user.email);

          if (existing) {
            // Update with existing auth_id
            const { error: updateError } = await supabase
              .from('users')
              .update({ auth_id: existing.id })
              .eq('id', user.id);

            if (updateError) throw updateError;

            console.log(`  ✅ Linked to existing: ${existing.id}`);
            successCount++;
            results.push({ userId: user.id, success: true, authId: existing.id });
            continue;
          }
        }

        throw authError;
      }

      // Update users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_id: authData.user.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      console.log(`  ✅ Created: ${authData.user.id}`);
      successCount++;
      results.push({ userId: user.id, success: true, authId: authData.user.id });

    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
      results.push({ userId: user.id, success: false, error: err.message });
    }

    // Small delay between users
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${successCount}/${users.length}`);
  console.log('='.repeat(60));

  // Save results
  writeFileSync('migration-batch-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Results saved to: migration-batch-results.json');

  // Check remaining
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .is('auth_id', null);

  console.log(`\n📊 Remaining users: ${count}`);

  if (count > 0) {
    console.log(`\n💡 Run again to migrate next batch:`);
    console.log(`   node scripts/migrate-batch.js ${batchSize}`);
  }
}

migrateBatch().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
