import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imfhacvrivasciftaujm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('==================================================');
console.log('TESTE LOGOUT - LIMPEZA DE SESSAO');
console.log('==================================================\n');

// TESTE 1: Login
console.log('TESTE 1: Fazer login');
const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
  email: 'rh@semrumo.pt',
  password: '123456'
});

if (loginError) {
  console.log('ERRO - Login falhou:', loginError.message);
  process.exit(1);
}

console.log('OK - Login bem-sucedido');
console.log('  User ID:', loginData.user.id);
console.log('  Email:', loginData.user.email);

// Verificar sessao
const { data: { session: sessionBefore } } = await supabase.auth.getSession();
console.log('  Sessao ativa:', sessionBefore ? 'SIM' : 'NAO');

// TESTE 2: Logout
console.log('\nTESTE 2: Fazer logout');
const { error: logoutError } = await supabase.auth.signOut();

if (logoutError) {
  console.log('ERRO - Logout falhou:', logoutError.message);
} else {
  console.log('OK - Logout executado');
}

// Verificar sessao apos logout
const { data: { session: sessionAfter } } = await supabase.auth.getSession();
console.log('  Sessao apos logout:', sessionAfter ? 'AINDA ATIVA (ERRO!)' : 'LIMPA');

console.log('\n==================================================');
console.log('CONCLUSAO: Logout', sessionAfter ? 'FALHOU' : 'FUNCIONA');
console.log('==================================================\n');

process.exit(0);
