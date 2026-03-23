/**
 * Test PIN Recovery Configuration
 *
 * This script tests all the requirements for PIN recovery to work:
 * 1. Supabase Service Key
 * 2. send_whatsapp_message function
 * 3. Wassenger API Key in settings
 * 4. Users have auth_id
 *
 * Usage:
 *   npx tsx scripts/test-pin-recovery-config.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testServiceKey() {
  console.log('\n🔑 Testing Service Key...');

  if (!SUPABASE_SERVICE_KEY) {
    results.push({
      test: 'Service Key',
      status: 'FAIL',
      message: 'VITE_SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_KEY not found in .env'
    });
    return;
  }

  // Try to use admin auth
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      results.push({
        test: 'Service Key',
        status: 'FAIL',
        message: `Service key invalid: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        test: 'Service Key',
        status: 'PASS',
        message: `Service key valid (found ${data?.users?.length || 0} users)`
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Service Key',
      status: 'FAIL',
      message: `Error testing service key: ${error.message}`
    });
  }
}

async function testWhatsAppFunction() {
  console.log('\n📱 Testing send_whatsapp_message function...');

  try {
    const { data, error } = await supabase.rpc('send_whatsapp_message', {
      p_phone: '+1234567890',
      p_message: 'VALIDATION_CHECK',
      p_api_key: 'TEST_KEY'
    });

    if (error) {
      if (error.code === '42883') {
        results.push({
          test: 'WhatsApp Function',
          status: 'FAIL',
          message: 'Function send_whatsapp_message does not exist in database',
          details: 'Run: supabase/migrations/005_create_whatsapp_proxy_function.sql'
        });
      } else {
        results.push({
          test: 'WhatsApp Function',
          status: 'WARN',
          message: `Function exists but returned error: ${error.message}`,
          details: error
        });
      }
    } else {
      results.push({
        test: 'WhatsApp Function',
        status: 'PASS',
        message: 'Function exists and responds correctly',
        details: data
      });
    }
  } catch (error: any) {
    results.push({
      test: 'WhatsApp Function',
      status: 'FAIL',
      message: `Error calling function: ${error.message}`
    });
  }
}

async function testWassengerConfig() {
  console.log('\n🔧 Testing Wassenger configuration...');

  try {
    // Check if settings table exists and has wassenger_key
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wassenger_key')
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        results.push({
          test: 'Wassenger Config',
          status: 'FAIL',
          message: 'Settings table does not exist',
          details: 'Create table: CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);'
        });
      } else {
        results.push({
          test: 'Wassenger Config',
          status: 'FAIL',
          message: `Error accessing settings: ${error.message}`,
          details: error
        });
      }
    } else if (!data) {
      results.push({
        test: 'Wassenger Config',
        status: 'FAIL',
        message: 'No wassenger_key found in settings table',
        details: "INSERT INTO settings (key, value) VALUES ('wassenger_key', 'YOUR_KEY_HERE');"
      });
    } else if (!data.value || data.value.trim() === '') {
      results.push({
        test: 'Wassenger Config',
        status: 'FAIL',
        message: 'wassenger_key exists but is empty',
        details: "UPDATE settings SET value = 'YOUR_KEY_HERE' WHERE key = 'wassenger_key';"
      });
    } else {
      results.push({
        test: 'Wassenger Config',
        status: 'PASS',
        message: `Wassenger key configured (${data.value.substring(0, 10)}...)`
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Wassenger Config',
      status: 'FAIL',
      message: `Error checking Wassenger config: ${error.message}`
    });
  }
}

async function testUserMigration() {
  console.log('\n👥 Testing user migration status...');

  try {
    // Count users without auth_id
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: migratedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('auth_id', 'is', null);

    const { count: notMigratedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('auth_id', null);

    if (notMigratedUsers && notMigratedUsers > 0) {
      results.push({
        test: 'User Migration',
        status: 'WARN',
        message: `${notMigratedUsers} out of ${totalUsers} users not migrated to Supabase Auth`,
        details: `Run: npm run migrate-users`
      });
    } else {
      results.push({
        test: 'User Migration',
        status: 'PASS',
        message: `All ${totalUsers} users migrated to Supabase Auth`
      });
    }
  } catch (error: any) {
    results.push({
      test: 'User Migration',
      status: 'FAIL',
      message: `Error checking user migration: ${error.message}`
    });
  }
}

async function testPhoneNumbers() {
  console.log('\n📞 Testing phone numbers...');

  try {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: usersWithPhone } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('phone', 'is', null)
      .neq('phone', '');

    const { count: usersWithMobile } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('mobile_phone', 'is', null)
      .neq('mobile_phone', '');

    const usersWithAnyPhone = (usersWithPhone || 0) + (usersWithMobile || 0);

    if (usersWithAnyPhone === 0) {
      results.push({
        test: 'Phone Numbers',
        status: 'FAIL',
        message: 'No users have phone numbers configured',
        details: 'Add phone numbers to users table'
      });
    } else if (usersWithAnyPhone < (totalUsers || 0)) {
      results.push({
        test: 'Phone Numbers',
        status: 'WARN',
        message: `Only ${usersWithAnyPhone} out of ${totalUsers} users have phone numbers`,
        details: 'Some users cannot use PIN recovery'
      });
    } else {
      results.push({
        test: 'Phone Numbers',
        status: 'PASS',
        message: `${usersWithAnyPhone} users have phone numbers configured`
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Phone Numbers',
      status: 'FAIL',
      message: `Error checking phone numbers: ${error.message}`
    });
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   PIN RECOVERY CONFIGURATION TEST                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  await testServiceKey();
  await testWhatsAppFunction();
  await testWassengerConfig();
  await testUserMigration();
  await testPhoneNumbers();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   TEST RESULTS                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';

    console.log(`${icon} ${color}${result.test}${reset}: ${result.message}`);
    if (result.details) {
      console.log(`   └─ ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}`);
    }
  });

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`Summary: ${passCount} PASS | ${failCount} FAIL | ${warnCount} WARN`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (failCount > 0) {
    console.log('❌ PIN Recovery is NOT ready. Fix the failures above.');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  PIN Recovery has warnings. Check issues above.');
    process.exit(0);
  } else {
    console.log('✅ PIN Recovery is fully configured and ready!');
    process.exit(0);
  }
}

main().catch(console.error);
