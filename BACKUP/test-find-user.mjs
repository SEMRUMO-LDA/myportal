#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testFindUser() {
  const testPhone = '911100707';

  console.log('🔍 Testing user lookup\n');
  console.log('Phone to search:', testPhone);
  console.log('='.repeat(60));

  // Test 1: Direct match
  console.log('\n📱 Test 1: Direct phone match');
  const { data: test1, error: error1 } = await supabase
    .from('users')
    .select('id, name, phone')
    .eq('phone', testPhone);

  console.log('Result:', test1);
  console.log('Error:', error1);

  // Test 2: With +351 prefix
  console.log('\n📱 Test 2: With +351 prefix');
  const { data: test2, error: error2 } = await supabase
    .from('users')
    .select('id, name, phone')
    .eq('phone', `+351${testPhone}`);

  console.log('Result:', test2);
  console.log('Error:', error2);

  // Test 3: Without prefix (clean)
  console.log('\n📱 Test 3: Clean phone (last 9 digits)');
  const cleanPhone = testPhone.replace(/^\+?351/, '');
  const { data: test3, error: error3 } = await supabase
    .from('users')
    .select('id, name, phone')
    .eq('phone', cleanPhone);

  console.log('Result:', test3);
  console.log('Error:', error3);

  // Test 4: List all phones in DB
  console.log('\n📊 All users with phones in DB:');
  const { data: allUsers, error: error4 } = await supabase
    .from('users')
    .select('id, name, phone')
    .not('phone', 'is', null)
    .limit(10);

  if (allUsers) {
    allUsers.forEach(u => {
      console.log(`  - ID ${u.id}: ${u.name} → ${u.phone}`);
    });
  }
  console.log('Error:', error4);

  // Test 5: Search with LIKE/ILIKE
  console.log('\n🔎 Test 5: Using LIKE pattern');
  const { data: test5, error: error5 } = await supabase
    .from('users')
    .select('id, name, phone')
    .ilike('phone', `%${testPhone}%`);

  console.log('Result:', test5);
  console.log('Error:', error5);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('Test 1 (exact):', test1?.length || 0, 'results');
  console.log('Test 2 (+351):', test2?.length || 0, 'results');
  console.log('Test 3 (clean):', test3?.length || 0, 'results');
  console.log('Test 5 (LIKE):', test5?.length || 0, 'results');
}

testFindUser();
