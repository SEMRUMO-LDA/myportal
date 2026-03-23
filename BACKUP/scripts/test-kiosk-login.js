import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY // Use ANON key to simulate frontend
);

async function testKioskLogin() {
  console.log('');
  console.log('🧪 TESTE DE LOGIN NO KIOSK');
  console.log('═'.repeat(60));
  console.log('');

  const userId = 73;
  const pin = '123456';

  // Step 1: Get user from database (simulating frontend fetch)
  console.log('📥 Step 1: Fetching user data...');
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId);

  if (!users || users.length === 0) {
    console.log('❌ User not found!');
    return;
  }

  const user = users[0];
  console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log('');

  // Step 2: Attempt login with Supabase Auth
  console.log('🔐 Step 2: Attempting login with PIN...');
  const userEmail = user.email || `user${user.id}@myportal.internal`;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: pin
  });

  if (authError) {
    console.log(`❌ Login failed: ${authError.message}`);
    return;
  }

  console.log(`✅ Login successful!`);
  console.log(`   Auth User ID: ${authData.user.id}`);
  console.log(`   Session expires: ${new Date(authData.session.expires_at * 1000).toLocaleString()}`);
  console.log('');

  // Step 3: Check if PIN is default
  const isDefaultPin = pin === '123456' || pin === '1111' || pin === '1234';
  console.log('🔍 Step 3: Checking PIN status...');
  console.log(`   Is default PIN? ${isDefaultPin ? 'YES ⚠️' : 'NO ✅'}`);
  console.log(`   Requires new PIN? ${user.requires_new_pin ? 'YES ⚠️' : 'NO ✅'}`);
  console.log('');

  if (isDefaultPin || user.requires_new_pin) {
    console.log('📝 User would be prompted to create new PIN');
    console.log('   (In real kiosk, after PIN change, clock action would execute)');
  } else {
    console.log('✅ PIN is valid, proceeding to clock action...');
  }
  console.log('');

  // Step 4: Fetch last log to determine IN/OUT
  console.log('📊 Step 4: Checking last time log...');
  const { data: lastLogs } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', user.id)
    .is('check_out', null)
    .order('date', { ascending: false })
    .order('check_in', { ascending: false })
    .limit(1);

  const hasOpenLog = lastLogs && lastLogs.length > 0;
  const actionToPerform = hasOpenLog ? 'OUT' : 'IN';

  console.log(`   Last open log: ${hasOpenLog ? 'YES' : 'NO'}`);
  console.log(`   Action to perform: ${actionToPerform} ✅`);
  console.log('');

  // Step 5: Simulate logout (important for kiosk!)
  console.log('🔒 Step 5: Logging out (kiosk security)...');
  await supabase.auth.signOut();
  console.log('✅ Logged out successfully');
  console.log('');

  console.log('═'.repeat(60));
  console.log('🎯 RESULTADO: Kiosk login flow completed successfully!');
  console.log('   Expected behavior:');
  console.log(`   1. User ${user.name} validates PIN`);
  console.log(`   2. ${isDefaultPin ? 'Creates new PIN' : 'Proceeds to clock action'}`);
  console.log(`   3. Clocks ${actionToPerform}`);
  console.log('   4. Shows success message');
  console.log('   5. Logs out after 3 seconds');
  console.log('   6. Returns to login screen');
  console.log('═'.repeat(60));
  console.log('');
}

testKioskLogin().catch(error => {
  console.error('');
  console.error('💥 ERROR:', error.message);
  console.error('');
});
