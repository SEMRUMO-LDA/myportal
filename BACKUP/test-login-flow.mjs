import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('Teste completo do fluxo de login\n');

// Simular login de user sem auth_id
const testUserId = 10024;
const testEmail = 'user' + testUserId + '@myportal.internal';
const testPin = '123456';

console.log('Dados do teste:');
console.log('   User ID:', testUserId);
console.log('   Email:', testEmail);
console.log('   PIN:', testPin, '\n');

// PASSO 1: Verificar se user existe na DB
console.log('PASSO 1: Verificando user na DB...');
const { data: user, error: userError } = await supabase
  .from('users')
  .select('id, name, email, auth_id, pin')
  .eq('id', testUserId)
  .single();

if (userError || !user) {
  console.error('ERRO: User nao encontrado:', userError);
  process.exit(1);
}

console.log('   OK User encontrado:', user.name);
console.log('   Email:', user.email || 'N/A');
console.log('   auth_id:', user.auth_id || 'NULL (nao migrado)');
console.log('   PIN:', user.pin ? 'Definido' : 'Nao definido', '\n');

// PASSO 2: Tentar login com Supabase Auth
console.log('PASSO 2: Tentando login com Supabase Auth...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPin
});

if (authError) {
  console.error('   ERRO Auth failed:', authError.message);
  console.log('\nPROBLEMA: User', testUserId, 'nao tem conta no Supabase Auth!');
  console.log('Este e o problema que esta a bloquear o login.\n');
  process.exit(1);
}

console.log('   OK Auth SUCCESS!');
console.log('   UUID:', authData.user.id);
console.log('   Email:', authData.user.email, '\n');

// PASSO 3: Simular resolveUserSession
console.log('PASSO 3: Simulando resolveUserSession...');

// Tentativa 1: auth_id
console.log('   Tentativa 1: Buscar por auth_id...');
const { data: userByAuthId } = await supabase
  .from('users')
  .select('id, role, name, email, requires_new_pin')
  .eq('auth_id', authData.user.id)
  .maybeSingle();

if (userByAuthId) {
  console.log('   OK Encontrado por auth_id:', userByAuthId.name);
} else {
  console.log('   AVISO: Nao encontrado por auth_id');
  
  // Tentativa 2: email
  console.log('   Tentativa 2: Buscar por email...');
  const { data: userByEmail } = await supabase
    .from('users')
    .select('id, role, name, email, requires_new_pin')
    .eq('email', testEmail.toLowerCase())
    .maybeSingle();
  
  if (userByEmail) {
    console.log('   OK Encontrado por email:', userByEmail.name);
  } else {
    console.error('   ERRO: Nao encontrado por email tambem!');
    process.exit(1);
  }
}

console.log('\nSUCESSO: Login funcionaria!');

// Cleanup
await supabase.auth.signOut();
process.exit(0);
