import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('\n🧪 TESTE DE LOGIN - MyPortal');
  console.log('═'.repeat(60));

  // Test user ID 73 (Tiago)
  const testUserId = 73;
  const testPin = '123456'; // Default PIN

  console.log('\n📋 Passo 1: Buscar utilizador da base de dados');
  console.log(`   User ID: ${testUserId}`);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, auth_id, requires_new_pin')
    .eq('id', testUserId)
    .single();

  if (userError) {
    console.log('   ❌ Erro ao buscar utilizador:', userError.message);
    return;
  }

  console.log('   ✅ Utilizador encontrado:');
  console.log(`      ID: ${user.id}`);
  console.log(`      Nome: ${user.name}`);
  console.log(`      Email: ${user.email}`);
  console.log(`      Auth ID: ${user.auth_id ? user.auth_id.substring(0, 8) + '...' : 'NULL'}`);
  console.log(`      Requer novo PIN: ${user.requires_new_pin}`);

  if (!user.auth_id) {
    console.log('\n   ⚠️  PROBLEMA: Utilizador não tem auth_id!');
    console.log('   Este utilizador não foi migrado para Supabase Auth.');
    return;
  }

  console.log('\n📋 Passo 2: Tentar login com Supabase Auth');
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: ${testPin}`);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: testPin
  });

  if (authError) {
    console.log('   ❌ Erro no login:', authError.message);
    console.log('\n💡 POSSÍVEIS CAUSAS:');
    console.log('   1. PIN incorreto (password diferente do esperado)');
    console.log('   2. Email não confirmado');
    console.log('   3. Conta desativada');
    console.log('\n🔧 SOLUÇÕES:');
    console.log('   • Resetar o PIN para este utilizador');
    console.log('   • Verificar se a migração correu bem');
    return;
  }

  console.log('   ✅ Login bem sucedido!');
  console.log(`      Auth User ID: ${authData.user.id}`);
  console.log(`      Email: ${authData.user.email}`);
  console.log(`      Session válida até: ${new Date(authData.session.expires_at * 1000).toLocaleString('pt-PT')}`);

  console.log('\n📋 Passo 3: Verificar dados da sessão');
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    console.log('   ✅ Sessão ativa');
    console.log(`      User ID: ${session.user.id}`);
    console.log(`      Email: ${session.user.email}`);
  } else {
    console.log('   ❌ Nenhuma sessão ativa');
  }

  // Cleanup - logout
  console.log('\n📋 Passo 4: Fazer logout');
  await supabase.auth.signOut();
  console.log('   ✅ Logout concluído');

  console.log('\n' + '═'.repeat(60));
  console.log('✅ TESTE CONCLUÍDO');
  console.log('\n💡 RESUMO:');
  console.log('   • Utilizador existe na base de dados');
  console.log('   • Auth ID está preenchido');
  if (authError) {
    console.log('   • ❌ LOGIN FALHOU - Ver causas acima');
  } else {
    console.log('   • ✅ LOGIN FUNCIONA CORRETAMENTE');
  }
  console.log('');
}

testLogin().catch(console.error);
