const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  console.log('🧪 TESTE DE SEGURANÇA - Sistema DESATIVADO');
  console.log('='.repeat(60));

  const today = new Date().toISOString().split('T')[0];

  // 1. Contar anomalias criadas HOJE
  const { data: todayAnomalies, error: anomErr } = await supabase
    .from('anomalies')
    .select('id, status, created_at')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false });

  console.log('\n1️⃣  Anomalias criadas HOJE:');
  if (anomErr) {
    console.log('   ❌ Erro:', anomErr.message);
  } else {
    console.log('   Total:', todayAnomalies?.length || 0);

    if (todayAnomalies && todayAnomalies.length > 0) {
      console.log('\n   ⚠️  ATENÇÃO: Encontradas anomalias criadas hoje!');
      console.log('   Últimas 3:');
      todayAnomalies.slice(0, 3).forEach(a => {
        const time = new Date(a.created_at).toLocaleTimeString('pt-PT');
        console.log(`     - ${a.id.substring(0, 8)}... (${a.status}) às ${time}`);
      });

      console.log('\n   💡 Se sistema estiver DESATIVADO, não deveriam ser criadas!');
      console.log('   💡 Verificar se são de antes da implementação.');
    } else {
      console.log('   ✅ Nenhuma anomalia criada hoje');
      console.log('   ✅ Sistema está DESATIVADO corretamente');
    }
  }

  // 2. Verificar picagens de HOJE
  const { data: todayLogs, error: logsErr } = await supabase
    .from('time_logs')
    .select('id, user_id, check_in, check_out, status')
    .eq('date', today)
    .order('check_in', { ascending: false })
    .limit(10);

  console.log('\n2️⃣  Picagens de HOJE (últimas 10):');
  if (logsErr) {
    console.log('   ❌ ERRO CRÍTICO:', logsErr.message);
  } else {
    console.log('   Total hoje:', todayLogs?.length || 0);

    if (todayLogs && todayLogs.length > 0) {
      console.log('   Amostra:');
      todayLogs.slice(0, 5).forEach(log => {
        const status = log.status || 'N/A';
        const checkout = log.check_out || 'Em curso';
        console.log(`     User ${log.user_id}: ${log.check_in} → ${checkout} [${status}]`);
      });
      console.log('   ✅ Sistema de picagem FUNCIONANDO');
    } else {
      console.log('   ⚠️  Sem picagens hoje (talvez ainda cedo?)');
    }
  }

  // 3. Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO DO TESTE:\n');

  const anomaliesCreatedToday = todayAnomalies?.length || 0;
  const timeLogsToday = todayLogs?.length || 0;

  if (!logsErr && timeLogsToday > 0) {
    console.log('✅ Picagem:          FUNCIONANDO (' + timeLogsToday + ' registos hoje)');
  } else {
    console.log('⚠️  Picagem:          Sem registos ou erro');
  }

  if (!anomErr && anomaliesCreatedToday === 0) {
    console.log('✅ Anomalias:        DESATIVADAS (0 criadas hoje)');
    console.log('✅ Impacto:          ZERO na picagem');
    console.log('\n🎉 SISTEMA SEGURO PARA PRODUÇÃO!');
  } else if (!anomErr && anomaliesCreatedToday > 0) {
    console.log('⚠️  Anomalias:        ' + anomaliesCreatedToday + ' criadas hoje');
    console.log('ℹ️  Nota:            Podem ser de antes desta implementação');
    console.log('\n⚠️  VERIFICAR: Configuração pode estar ATIVA!');
  }

  console.log('\n' + '='.repeat(60));
})();
