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
  env.VITE_SUPABASE_ANON_KEY  // Using ANON key like the app does
);

console.log('🧪 Testing production issue with user 69...\n');

try {
  console.log('1️⃣ Fetching users with ANON key...');
  const startTime = Date.now();

  const { data, error, count } = await supabase
    .from('users')
    .select('id, name, email, status', { count: 'exact' })
    .eq('status', 'ACTIVE')
    .order('id', { ascending: true });

  const duration = Date.now() - startTime;

  if (error) {
    console.log('❌ ERROR:', error.message);
    console.log('   Code:', error.code);
    console.log('   Details:', error.details);
    console.log('   Hint:', error.hint);
  } else {
    console.log(`✅ Success! Fetched ${data.length} users in ${duration}ms`);
    console.log(`   Total count: ${count}`);

    // Check if user 69 exists
    const user69 = data.find(u => u.id === 69);
    if (user69) {
      console.log('\n👤 User 69 found:');
      console.log('   ID:', user69.id);
      console.log('   Name:', user69.name);
      console.log('   Email:', user69.email);
      console.log('   Status:', user69.status);
    } else {
      console.log('\n⚠️  User 69 NOT in results');
      console.log('   IDs found:', data.slice(0, 10).map(u => u.id));
    }
  }
} catch (err) {
  console.log('💥 EXCEPTION:', err.message);
  console.log('   Stack:', err.stack);
}

console.log('\n📊 Connection info:');
console.log('   URL:', env.VITE_SUPABASE_URL);
console.log('   Key:', env.VITE_SUPABASE_ANON_KEY.substring(0, 20) + '...');
