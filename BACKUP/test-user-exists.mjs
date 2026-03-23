import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imfhacvrivasciftaujm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserExists(userId) {
  console.log(`\n🔍 Procurando utilizador com ID: ${userId}`);
  
  // Teste 1: Buscar por ID numérico
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, name, email, role, status')
    .eq('id', userId)
    .single();
  
  if (userError) {
    console.error('❌ Erro ao buscar utilizador:', userError.message);
  } else if (userData) {
    console.log('✅ Utilizador encontrado:');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Nome: ${userData.name}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Status: ${userData.status}`);
  } else {
    console.log('❌ Utilizador não encontrado');
  }
  
  // Teste 2: Listar primeiros 5 utilizadores ativos
  console.log('\n📋 Primeiros 5 utilizadores ativos:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, status')
    .eq('status', 'ACTIVE')
    .order('id', { ascending: true })
    .limit(5);
  
  if (usersError) {
    console.error('❌ Erro ao listar utilizadores:', usersError.message);
  } else if (users) {
    users.forEach(u => {
      console.log(`   ID: ${u.id} - ${u.name} (${u.email})`);
    });
  }
}

// Testar com o ID que o utilizador tentou (assumindo que foi algo entre 1-10)
const testIds = [1, 2, 3, 69];

for (const id of testIds) {
  await testUserExists(id);
}

process.exit(0);
