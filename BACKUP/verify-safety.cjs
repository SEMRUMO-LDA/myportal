const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  console.log('🔒 VERIFICAÇÃO DE SEGURANÇA');
  console.log('='.repeat(60));

  // 1. Verificar estrutura de anomalies
  const { data: anomalies, error: anomErr } = await supabase
    .from('anomalies')
    .select('*')
    .limit(5);

  console.log('\n1️⃣  Tabela anomalies:');
  if (anomErr) {
    console.log('   ⚠️  Erro:', anomErr.message);
    console.log('   → Precisamos criar a tabela');
  } else {
    console.log('   ✅ Existe e funciona');
    console.log('   → Registos existentes:', anomalies?.length || 0);
  }

  // 2. Verificar time_logs (crítico para picagem)
  const today = new Date().toISOString().split('T')[0];
  const { data: todayLogs, error: logsErr } = await supabase
    .from('time_logs')
    .select('id, user_id, date, check_in, status')
    .eq('date', today)
    .limit(5);

  console.log('\n2️⃣  Tabela time_logs (CRÍTICA):');
  if (logsErr) {
    console.log('   ❌ ERRO CRÍTICO:', logsErr.message);
    console.log('   → ABORTAR - Picagem pode estar comprometida!');
  } else {
    console.log('   ✅ Funcionando perfeitamente');
    console.log('   → Registos de hoje:', todayLogs?.length || 0);
    if (todayLogs && todayLogs.length > 0) {
      console.log('   → Último registo:', todayLogs[0].user_id, 'às', todayLogs[0].check_in);
    }
  }

  // 3. Testar INSERT em time_logs (simular picagem)
  console.log('\n3️⃣  Teste de INSERT (simular picagem):');
  const testLog = {
    user_id: 1,
    date: '2099-12-31', // Data futura para não interferir
    check_in: '00:00:00',
    status: 'TEST'
  };

  const { data: insertTest, error: insertErr } = await supabase
    .from('time_logs')
    .insert(testLog)
    .select()
    .single();

  if (insertErr) {
    console.log('   ⚠️  Erro ao inserir:', insertErr.message);
  } else {
    console.log('   ✅ INSERT funciona');
    // Limpar teste
    await supabase.from('time_logs').delete().eq('id', insertTest.id);
    console.log('   ✅ Registo de teste removido');
  }

  // 4. Verificar índices
  console.log('\n4️⃣  Sistema está pronto para mudanças?');
  if (!logsErr && !insertErr) {
    console.log('   ✅ SIM - Picagem funcionando normalmente');
    console.log('   ✅ Seguro avançar para Passo 2');
  } else {
    console.log('   ❌ NÃO - Resolver problemas primeiro!');
  }

  console.log('\n' + '='.repeat(60));
})();
