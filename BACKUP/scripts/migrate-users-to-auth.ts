/**
 * Migration Script: Create Supabase Auth Users
 *
 * This script:
 * 1. Fetches all users from the users table that don't have auth_id yet
 * 2. Creates a corresponding Supabase Auth user for each
 * 3. Updates the users table with the auth_id
 *
 * Usage:
 *   npx tsx scripts/migrate-users-to-auth.ts
 *
 * Prerequisites:
 *   - SUPABASE_SERVICE_KEY must be set in .env.local
 *   - Users table must have email and auth_id columns
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('❌ Error: VITE_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY not found in .env.local');
  console.error('ℹ️  You can find it in: https://supabase.com/dashboard/project/imfhacvrivasciftaujm/settings/api');
  console.error('ℹ️  Add to .env.local: SUPABASE_SERVICE_KEY=your-service-role-key');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AppUser {
  id: number;
  name: string;
  email: string;
  pin?: string;
  auth_id?: string;
}

interface MigrationResult {
  userId: number;
  userName: string;
  email: string;
  authId?: string;
  success: boolean;
  error?: string;
}

async function migrateUsers(): Promise<void> {
  console.log('🚀 Starting user migration to Supabase Auth...\n');

  // 1. Fetch all users without auth_id
  console.log('📊 Fetching users from database...');
  const { data: users, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, name, email, pin, auth_id')
    .is('auth_id', null)
    .order('id');

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('✅ No users to migrate. All users already have auth_id!');
    return;
  }

  console.log(`📈 Found ${users.length} users to migrate\n`);
  console.log('─'.repeat(80));

  const results: MigrationResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  // 2. Migrate each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i] as AppUser;
    const progress = `[${i + 1}/${users.length}]`;

    console.log(`\n${progress} Migrating user ${user.id}: ${user.name}`);
    console.log(`  📧 Email: ${user.email}`);

    try {
      // Generate password from PIN or create temporary one
      const password = user.pin || generateTemporaryPassword(user.id);

      if (!user.pin) {
        console.log(`  ⚠️  No PIN found - using temporary password: ${password}`);
      }

      // Create user in Supabase Auth
      console.log(`  🔐 Creating Supabase Auth user...`);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          app_user_id: user.id,
          name: user.name,
          migrated_at: new Date().toISOString(),
          migration_version: '1.0'
        }
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          console.log(`  ℹ️  User already exists in Supabase Auth`);

          // Try to find existing auth user by email
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users.find(u => u.email === user.email);

          if (existingUser) {
            console.log(`  ✅ Found existing auth user: ${existingUser.id}`);

            // Update app user with auth_id
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({ auth_id: existingUser.id })
              .eq('id', user.id);

            if (updateError) {
              throw new Error(`Failed to update auth_id: ${updateError.message}`);
            }

            console.log(`  ✅ Linked existing auth user to app user`);

            results.push({
              userId: user.id,
              userName: user.name,
              email: user.email,
              authId: existingUser.id,
              success: true
            });
            successCount++;
            continue;
          }
        }

        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user data returned from Supabase Auth');
      }

      console.log(`  ✅ Auth user created: ${authData.user.id}`);

      // 3. Update app user with auth_id
      console.log(`  💾 Updating users table...`);
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ auth_id: authData.user.id })
        .eq('id', user.id);

      if (updateError) {
        console.error(`  ❌ Failed to update auth_id:`, updateError);
        throw updateError;
      }

      console.log(`  ✅ Successfully migrated user ${user.id}`);

      results.push({
        userId: user.id,
        userName: user.name,
        email: user.email,
        authId: authData.user.id,
        success: true
      });
      successCount++;

    } catch (err: any) {
      console.error(`  ❌ Error migrating user ${user.id}:`, err.message);

      results.push({
        userId: user.id,
        userName: user.name,
        email: user.email,
        success: false,
        error: err.message
      });
      errorCount++;
    }
  }

  // 4. Print summary
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successfully migrated: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📈 Total: ${users.length}`);
  console.log('='.repeat(80));

  // 5. Print errors if any
  if (errorCount > 0) {
    console.log('\n❌ ERRORS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  User ${r.userId} (${r.userName}): ${r.error}`);
    });
  }

  // 6. Save results to file
  const resultsPath = path.join(__dirname, '..', 'migration-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);

  // 7. Verify migration
  console.log('\n🔍 Verifying migration...');
  const { data: remainingUsers, error: verifyError } = await supabaseAdmin
    .from('users')
    .select('id')
    .is('auth_id', null);

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    const remaining = remainingUsers?.length || 0;
    if (remaining === 0) {
      console.log('✅ All users migrated successfully!');
    } else {
      console.log(`⚠️  ${remaining} users still without auth_id`);
    }
  }
}

function generateTemporaryPassword(userId: number): string {
  // Generate a secure temporary password
  // Format: TMP{userId}-{random}
  const random = Math.random().toString(36).substring(2, 10);
  return `TMP${userId}-${random}`;
}

// Run migration
migrateUsers()
  .then(() => {
    console.log('\n✅ Migration completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
