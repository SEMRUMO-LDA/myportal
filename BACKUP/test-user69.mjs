import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://imfhacvrivasciftaujm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE1NzQyNSwiZXhwIjoyMDg0NzMzNDI1fQ.0IzRioNPcH-pcsWPQo3LrdAIGkVbC3ONgjAiFDdh4mM'
);

console.log('🔍 Testing user 69 fetch...\n');

try {
  const { data, error, count } = await supabase
    .from('users')
    .select('id, name, email', { count: 'exact' })
    .eq('id', 69);

  if (error) {
    console.log('❌ Error:', error.message);
  } else if (!data || data.length === 0) {
    console.log('⚠️  User 69 NOT found in database');
    console.log('   Total records matching id=69:', count);
  } else {
    console.log('✅ User 69 found:');
    console.log('   ID:', data[0].id);
    console.log('   Name:', data[0].name);
    console.log('   Email:', data[0].email);
  }

  // Also get total user count
  const { count: totalCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  console.log('\n📊 Total users in database:', totalCount);

} catch (err) {
  console.log('❌ Exception:', err.message);
}
