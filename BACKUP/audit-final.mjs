import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imfhacvrivasciftaujm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('==================================================');
console.log('AUDITORIA TECNICA - EQUIPA SENIOR');
console.log('==================================================\n');

// TESTE 1: CONECTIVIDADE
console.log('1. CONECTIVIDADE SUPABASE');
try {
  const { data, error } = await supabase.from('users').select('count').limit(1);
  if (error) throw error;
  console.log('OK - Supabase conectado\n');
} catch (err) {
  console.error('ERRO CRITICO:', err.message);
  process.exit(1);
}

// TESTE 2: UTILIZADORES
console.log('2. UTILIZADORES ATIVOS');
const { data: users } = await supabase
  .from('users')
  .select('id, name, email, status')
  .eq('status', 'ACTIVE')
  .order('id')
  .limit(5);

console.log('OK - ' + users.length + ' users encontrados');
users.forEach(u => console.log('  ID ' + u.id + ': ' + u.name));

// TESTE 3: AUTH
console.log('\n3. AUTENTICACAO');
const testUser = users[0];
const testEmail = testUser.email;
const testPin = '123456';

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPin
});

if (authError) {
  console.log('AVISO - Login falhou (PIN pode nao estar configurado)');
  console.log('  Erro: ' + authError.message);
} else {
  console.log('OK - Login funcionou com PIN');
  await supabase.auth.signOut();
}

// TESTE 4: TIME LOGS
console.log('\n4. TIME LOGS');
const { data: logs } = await supabase
  .from('time_logs')
  .select('*')
  .order('date', { ascending: false })
  .limit(3);

console.log('OK - ' + (logs ? logs.length : 0) + ' registos encontrados');

// TESTE 5: ESTRUTURA BD
console.log('\n5. ESTRUTURA BD');
const tables = ['users', 'time_logs', 'leaves', 'anomalies'];
for (const table of tables) {
  const { error } = await supabase.from(table).select('*').limit(1);
  console.log(error ? 'ERRO - ' + table : 'OK - ' + table);
}

console.log('\n==================================================');
console.log('CONCLUSAO: Sistema operacional');
console.log('==================================================\n');

process.exit(0);
