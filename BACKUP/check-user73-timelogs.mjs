#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const USER_ID = 73;
const today = new Date().toISOString().split('T')[0];

console.log('=== VERIFICAÇÃO TIME_LOGS USER 73 ===\n');
console.log(`📅 Data de hoje: ${today}\n`);

// Buscar todos os time_logs de hoje
const { data: todayLogs, error } = await supabase
  .from('time_logs')
  .select('*')
  .eq('user_id', USER_ID)
  .eq('date', today)
  .order('check_in', { ascending: true });

if (error) {
  console.error('❌ Erro ao buscar time_logs:', error);
  process.exit(1);
}

console.log(`🔍 ${todayLogs?.length || 0} registos encontrados para hoje:\n`);

todayLogs?.forEach((log, index) => {
  const status = log.status || 'UNKNOWN';
  const checkIn = log.check_in || '??:??';
  const checkOut = log.check_out || 'ABERTO';
  const icon = status === 'COMPLETED' ? '🔴' : '🟢';

  console.log(`  ${index + 1}. ${icon} ${status.padEnd(10)} - ${checkIn} → ${checkOut}`);
  console.log(`     ID: ${log.id}`);
  console.log(`     Created: ${log.created_at}`);
  console.log('');
});

// Buscar registo ativo (sem check_out)
const { data: activeLogs } = await supabase
  .from('time_logs')
  .select('*')
  .eq('user_id', USER_ID)
  .is('check_out', null)
  .order('created_at', { ascending: false });

console.log('\n📊 REGISTOS ATIVOS (sem check_out):');
console.log(`   Total: ${activeLogs?.length || 0}\n`);

if (activeLogs && activeLogs.length > 0) {
  console.log('⚠️  PROBLEMA DETECTADO: Múltiplos registos ativos!\n');
  console.log('   Isto pode causar comportamento inesperado no sistema.');
  console.log('   O sistema deveria ter APENAS 1 registo ativo por vez.\n');
}

// Verificar qual seria o lastLog retornado
if (todayLogs && todayLogs.length > 0) {
  const sortedLogs = [...todayLogs].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.check_in || '').localeCompare(a.check_in || '');
  });

  const lastLog = sortedLogs[0];
  const isWorking = lastLog && !lastLog.check_out;

  console.log('🎯 ÚLTIMO REGISTO (lastLog retornado ao UI):');
  console.log(`   ID: ${lastLog.id}`);
  console.log(`   Status: ${lastLog.status}`);
  console.log(`   Check-in: ${lastLog.check_in}`);
  console.log(`   Check-out: ${lastLog.check_out || 'ABERTO'}`);
  console.log(`   isWorking: ${isWorking ? '✅ SIM (mostra botão SAÍDA)' : '❌ NÃO (mostra botão ENTRADA)'}`);
}
