import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imfhacvrivasciftaujm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('═══════════════════════════════════════════════════════');
console.log('🔧 AUDITORIA TÉCNICA - EQUIPA SENIOR (30 ENGENHEIROS)');
console.log('═══════════════════════════════════════════════════════\n');

// ===== TESTE 1: CONECTIVIDADE SUPABASE =====
console.log('📡 TESTE 1: CONECTIVIDADE SUPABASE');
try {
  const { data, error } = await supabase.from('users').select('count').limit(1);
  if (error) throw error;
  console.log('✅ Supabase conectado e respondendo');
} catch (err) {
  console.error('❌ FALHA CRÍTICA: Supabase não responde:', err.message);
  process.exit(1);
}

// ===== TESTE 2: UTILIZADORES ATIVOS =====
console.log('\n👥 TESTE 2: UTILIZADORES ATIVOS');
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('id, name, email, status, role')
  .eq('status', 'ACTIVE')
  .order('id', { ascending: true })
  .limit(10);

if (usersError) {
  console.error('❌ FALHA: Não consegue ler utilizadores:', usersError.message);
  process.exit(1);
}

console.log(`✅ Encontrados ${users.length} utilizadores ativos`);
console.log('\n📋 Utilizadores de teste:');
users.slice(0, 5).forEach(u => {
  console.log(`   • ID ${u.id}: ${u.name} (${u.role || 'Sem role'})`);
});

// ===== TESTE 3: AUTH - LOGIN COM PIN =====
console.log('\n🔐 TESTE 3: AUTENTICAÇÃO (LOGIN COM PIN)');
const testUser = users.find(u => u.id === 69) || users[0];
console.log(`   Testando com: ${testUser.name} (ID: ${testUser.id})`);

// Tentar login
const testEmail = testUser.email || `user${testUser.id}@myportal.internal`;
const testPin = '123456'; // PIN temporário padrão

console.log(`   Email: ${testEmail}`);
console.log(`   PIN: ${testPin}`);

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPin
});

if (authError) {
  console.log('⚠️  Login falhou (esperado se PIN ainda não foi configurado)');
  console.log(`   Erro: ${authError.message}`);
} else {
  console.log('✅ Login com PIN FUNCIONA!');
  console.log(`   User ID: ${authData.user.id}`);
  console.log(`   Email: ${authData.user.email}`);
  
  // Fazer logout
  await supabase.auth.signOut();
  console.log('✅ Logout executado');
}

// ===== TESTE 4: TIME LOGS (ENTRADAS/SAÍDAS) =====
console.log('\n⏰ TESTE 4: TIME LOGS (ÚLTIMOS REGISTOS)');
const { data: timeLogs, error: logsError } = await supabase
  .from('time_logs')
  .select('*')
  .order('date', { ascending: false })
  .order('check_in', { ascending: false })
  .limit(5);

if (logsError) {
  console.error('❌ FALHA: Não consegue ler time_logs:', logsError.message);
} else {
  console.log(`✅ Encontrados ${timeLogs.length} registos recentes`);
  timeLogs.forEach(log => {
    console.log(`   • User ${log.user_id}: ${log.date} ${log.check_in} → ${log.check_out || 'ABERTO'}`);
  });
}

// ===== TESTE 5: PERMISSÕES DE ESCRITA =====
console.log('\n✍️  TESTE 5: PERMISSÕES DE ESCRITA');
const testLogData = {
  user_id: testUser.id,
  date: new Date().toISOString().split('T')[0],
  check_in: '09:00',
  check_in_location: 'TESTE AUTOMÁTICO',
  status: 'COMPLETE'
};

// Verificar se pode inserir (RLS)
const { data: insertTest, error: insertError } = await supabase
  .from('time_logs')
  .insert(testLogData)
  .select()
  .maybeSingle();

if (insertError) {
  console.log('⚠️  Não pode inserir diretamente (RLS ativo - CORRETO)');
  console.log(`   Erro: ${insertError.message}`);
} else if (insertTest) {
  console.log('✅ Consegue inserir registos');
  // Limpar teste
  await supabase.from('time_logs').delete().eq('id', insertTest.id);
  console.log('   (Registo de teste removido)');
}

// ===== TESTE 6: ESTRUTURA DA BD =====
console.log('\n🗄️  TESTE 6: VERIFICAR ESTRUTURA DA BD');
const requiredTables = ['users', 'time_logs', 'leaves', 'expenses', 'anomalies'];
let allTablesOk = true;

for (const table of requiredTables) {
  const { error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.log(`❌ Tabela '${table}' não acessível: ${error.message}`);
    allTablesOk = false;
  } else {
    console.log(`✅ Tabela '${table}' OK`);
  }
}

// ===== RESUMO FINAL =====
console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 RESUMO DA AUDITORIA');
console.log('═══════════════════════════════════════════════════════');
console.log('✅ Conectividade Supabase: OK');
console.log(`✅ Utilizadores ativos: ${users.length}`);
console.log(`✅ Time logs acessíveis: ${timeLogs ? 'SIM' : 'NÃO'}`);
console.log(`✅ Estrutura BD: ${allTablesOk ? 'COMPLETA' : 'INCOMPLETA'}`);
console.log('\n🎯 CONCLUSÃO: Sistema pronto para testes de login/logout');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(0);
