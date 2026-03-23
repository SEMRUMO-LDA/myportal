/**
 * RLS Policy Testing Script
 * Tests Row Level Security policies to ensure proper data isolation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY';

// Client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

// Test results tracking
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

interface TestUser {
  id: number;
  email: string;
  password: string;
  role: string;
  department_id?: number;
}

// Test users configuration
const testUsers: TestUser[] = [
  {
    id: 9001,
    email: 'test.employee@myportal.test',
    password: '123456',
    role: 'Colaborador',
    department_id: 1
  },
  {
    id: 9002,
    email: 'test.manager@myportal.test',
    password: '123456',
    role: 'Responsável de Departamento',
    department_id: 1
  },
  {
    id: 9003,
    email: 'test.admin@myportal.test',
    password: '123456',
    role: 'Administrador',
    department_id: 2
  },
  {
    id: 9004,
    email: 'test.employee2@myportal.test',
    password: '123456',
    role: 'Colaborador',
    department_id: 2
  }
];

async function setupTestUsers() {
  console.log('🔧 Setting up test users...');

  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Create database user with auth_id
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: `Test ${user.role}`,
          role: user.role,
          department_id: user.department_id,
          auth_id: authData.user.id,
          status: 'ACTIVE',
          pin: '123456',
          requires_new_pin: false
        });

      if (dbError) throw dbError;

      console.log(`✅ Created test user: ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to create user ${user.email}:`, error);
    }
  }
}

async function cleanupTestUsers() {
  console.log('🧹 Cleaning up test users...');

  for (const user of testUsers) {
    try {
      // Delete from database first
      await supabaseAdmin.from('users').delete().eq('id', user.id);

      // Delete from auth
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users.find(u => u.email === user.email);
      if (authUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }

      console.log(`✅ Cleaned up test user: ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup user ${user.email}:`, error);
    }
  }
}

async function testAsUser(user: TestUser, testName: string, testFn: (client: any) => Promise<void>) {
  console.log(`\n📋 Testing: ${testName}`);
  console.log(`   As user: ${user.email} (${user.role})`);

  try {
    // Create client for this user
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });

    if (authError) throw authError;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`
        }
      }
    });

    await testFn(userClient);
    testsPassed++;
    console.log(`   ✅ PASSED`);
  } catch (error: any) {
    testsFailed++;
    console.log(`   ❌ FAILED: ${error.message}`);
  } finally {
    testsRun++;
  }
}

// ============================================
// TEST CASES
// ============================================

async function runTests() {
  console.log('\n🚀 Starting RLS Policy Tests\n');
  console.log('=' .repeat(50));

  // Setup test data
  await setupTestUsers();

  // Create some test data
  console.log('\n📝 Creating test data...');

  // Create time logs
  await supabaseAdmin.from('time_logs').insert([
    { user_id: 9001, clock_in: new Date().toISOString(), type: 'IN' },
    { user_id: 9002, clock_in: new Date().toISOString(), type: 'IN' },
    { user_id: 9003, clock_in: new Date().toISOString(), type: 'IN' },
    { user_id: 9004, clock_in: new Date().toISOString(), type: 'IN' }
  ]);

  // Create leaves
  await supabaseAdmin.from('leaves').insert([
    {
      user_id: 9001,
      start_date: '2024-04-01',
      end_date: '2024-04-05',
      type: 'vacation',
      status: 'PENDING'
    },
    {
      user_id: 9004,
      start_date: '2024-04-10',
      end_date: '2024-04-12',
      type: 'sick',
      status: 'PENDING'
    }
  ]);

  console.log('=' .repeat(50));

  // ============================================
  // TEST 1: Employee can only see own profile
  // ============================================
  await testAsUser(testUsers[0], 'Employee viewing users', async (client) => {
    const { data, error } = await client.from('users').select('id, name, role');

    if (error) throw error;
    if (!data) throw new Error('No data returned');
    if (data.length !== 1) throw new Error(`Expected 1 user, got ${data.length}`);
    if (data[0].id !== 9001) throw new Error('Got wrong user data');
  });

  // ============================================
  // TEST 2: Admin can see all users
  // ============================================
  await testAsUser(testUsers[2], 'Admin viewing all users', async (client) => {
    const { data, error } = await client.from('users').select('id').order('id');

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    // Admin should see many users (not just test users)
    console.log(`   Found ${data.length} users (admin view)`);
    if (data.length < 4) throw new Error('Admin should see all users');
  });

  // ============================================
  // TEST 3: Manager can see department users
  // ============================================
  await testAsUser(testUsers[1], 'Manager viewing department users', async (client) => {
    const { data, error } = await client
      .from('users')
      .select('id, department_id')
      .eq('department_id', 1)
      .order('id');

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    // Manager should see users in their department
    const deptUsers = data.filter(u => u.department_id === 1);
    console.log(`   Found ${deptUsers.length} users in department 1`);
    if (deptUsers.length < 2) throw new Error('Manager should see department users');
  });

  // ============================================
  // TEST 4: Employee can only see own time logs
  // ============================================
  await testAsUser(testUsers[0], 'Employee viewing time logs', async (client) => {
    const { data, error } = await client.from('time_logs').select('user_id');

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    // Should only see own logs
    const wrongLogs = data.filter(log => log.user_id !== 9001);
    if (wrongLogs.length > 0) throw new Error('Employee can see other users logs!');
    console.log(`   Employee sees ${data.length} own time logs`);
  });

  // ============================================
  // TEST 5: Employee cannot see other's leaves
  // ============================================
  await testAsUser(testUsers[0], 'Employee viewing leaves', async (client) => {
    const { data, error } = await client.from('leaves').select('user_id');

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    // Should only see own leaves
    const wrongLeaves = data.filter(leave => leave.user_id !== 9001);
    if (wrongLeaves.length > 0) throw new Error('Employee can see other users leaves!');
    console.log(`   Employee sees ${data.length} own leave requests`);
  });

  // ============================================
  // TEST 6: Employee cannot update other's profile
  // ============================================
  await testAsUser(testUsers[0], 'Employee trying to update another user', async (client) => {
    const { error } = await client
      .from('users')
      .update({ mobile_phone: '+351999999999' })
      .eq('id', 9002);

    // This should fail with RLS error
    if (!error) throw new Error('Employee was able to update another user!');
    console.log(`   Correctly blocked: ${error.message}`);
  });

  // ============================================
  // TEST 7: Admin can update any user
  // ============================================
  await testAsUser(testUsers[2], 'Admin updating another user', async (client) => {
    const { error } = await client
      .from('users')
      .update({ mobile_phone: '+351888888888' })
      .eq('id', 9001);

    if (error) throw new Error(`Admin should be able to update users: ${error.message}`);
  });

  // ============================================
  // TEST 8: Employee can create own time log
  // ============================================
  await testAsUser(testUsers[0], 'Employee creating own time log', async (client) => {
    const { error } = await client
      .from('time_logs')
      .insert({
        user_id: 9001,
        clock_in: new Date().toISOString(),
        type: 'OUT'
      });

    if (error) throw new Error(`Employee should create own logs: ${error.message}`);
  });

  // ============================================
  // TEST 9: Employee cannot create log for others
  // ============================================
  await testAsUser(testUsers[0], 'Employee trying to create log for another user', async (client) => {
    const { error } = await client
      .from('time_logs')
      .insert({
        user_id: 9002,
        clock_in: new Date().toISOString(),
        type: 'OUT'
      });

    // This should fail
    if (!error) throw new Error('Employee was able to create log for another user!');
    console.log(`   Correctly blocked: ${error.message}`);
  });

  // ============================================
  // TEST 10: Check unauthorized access is blocked
  // ============================================
  console.log(`\n📋 Testing: Unauthorized access`);
  console.log(`   Without authentication`);

  try {
    const unauthClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await unauthClient.from('users').select('*');

    if (!error || data?.length > 0) {
      testsFailed++;
      console.log(`   ❌ FAILED: Unauthorized user could access data!`);
    } else {
      testsPassed++;
      console.log(`   ✅ PASSED: Unauthorized access blocked`);
    }
  } catch (error) {
    testsPassed++;
    console.log(`   ✅ PASSED: Unauthorized access blocked`);
  } finally {
    testsRun++;
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await supabaseAdmin.from('time_logs').delete().gte('user_id', 9001).lte('user_id', 9004);
  await supabaseAdmin.from('leaves').delete().gte('user_id', 9001).lte('user_id', 9004);
  await cleanupTestUsers();

  // Results
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${testsRun}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All RLS policies working correctly!');
  } else {
    console.log('\n⚠️  Some RLS policies need attention!');
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);