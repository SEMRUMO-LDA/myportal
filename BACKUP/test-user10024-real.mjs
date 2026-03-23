import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('Teste LOGIN User 10024 - Daniela\n');

const testUserId = 10024;

// Buscar user da DB para obter email correto
const { data: user } = await supabase
  .from('users')
  .select('id, name, email, auth_id')
  .eq('id', testUserId)
  .single();

console.log('User:', user.name);
console.log('Email:', user.email);
console.log('auth_id:', user.auth_id, '\n');

// Tentar login com email CORRETO
console.log('Tentando login com email:', user.email);
console.log('PIN: 123456\n');

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: user.email,
  password: '123456'
});

if (authError) {
  console.error('ERRO:', authError.message);
  
  // Verificar se conta existe
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.auth_id);
  if (authUser.user) {
    console.log('\nConta existe no Auth! Email da conta:', authUser.user.email);
    console.log('Problema: PASSWORD INCORRETO ou EMAIL DIFERENTE');
  } else {
    console.log('\nConta NAO existe no Auth com este auth_id!');
  }
  
  process.exit(1);
}

console.log('SUCESSO! Login funcionou!');
console.log('Auth UUID:', authData.user.id);

await supabase.auth.signOut();
process.exit(0);
