#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://imfhacvrivasciftaujm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs'
);

const userName = 'Tiago Jorge da Silva Pacheco';

console.log(`🔍 Investigando estado de: ${userName}\n`);

// 1. Buscar utilizador
const { data: users } = await supabase
  .from('users')
  .select('*')
  .ilike('name', `%${userName}%`);

if (!users || users.length === 0) {
  console.error('❌ Utilizador não encontrado!');
  process.exit(1);
}

const user = users[0];
console.log(`✅ User ID: ${user.id}`);
console.log(`📧 Email: ${user.email}`);
console.log('');

// 2. Verificar time_logs de hoje
const today = new Date().toISOString().split('T')[0];
console.log(`📅 Verificando time_logs de hoje (${today}):`);

const { data: todayLogs } = await supabase
  .from('time_logs')
  .select('*')
  .eq('user_id', user.id)
  .eq('date', today)
  .order('check_in', { ascending: false });

if (todayLogs && todayLogs.length > 0) {
  todayLogs.forEach((log, i) => {
    const status = log.check_out ? '🔴 SAÍDA' : '🟢 ENTRADA';
    console.log(`  ${i + 1}. ${status} - ${log.check_in} → ${log.check_out || 'ABERTO'}`);
    console.log(`     Status: ${log.status}`);
    console.log(`     ID: ${log.id}`);
  });
} else {
  console.log('  ℹ️  Nenhum log hoje');
}
console.log('');

// 3. Verificar trips ativas
console.log('🚗 Verificando trips ativas:');

const { data: activeTrips } = await supabase
  .from('trips')
  .select('*')
  .eq('user_id', user.id)
  .is('end_time', null)
  .order('start_time', { ascending: false });

if (activeTrips && activeTrips.length > 0) {
  activeTrips.forEach((trip, i) => {
    console.log(`  ${i + 1}. 🚗 TRIP ATIVA`);
    console.log(`     Veículo ID: ${trip.vehicle_id}`);
    console.log(`     Início: ${trip.start_time}`);
    console.log(`     Destino: ${trip.destination || 'N/A'}`);
    console.log(`     ID: ${trip.id}`);
  });
} else {
  console.log('  ℹ️  Nenhuma trip ativa');
}
console.log('');

// 4. Último log (últimos 7 dias)
console.log('📊 Último registo (últimos 7 dias):');
const { data: lastLogs } = await supabase
  .from('time_logs')
  .select('*')
  .eq('user_id', user.id)
  .order('date', { ascending: false })
  .order('check_in', { ascending: false })
  .limit(3);

if (lastLogs && lastLogs.length > 0) {
  const lastLog = lastLogs[0];
  const isWorking = !lastLog.check_out;
  
  console.log(`  Data: ${lastLog.date}`);
  console.log(`  Check-in: ${lastLog.check_in}`);
  console.log(`  Check-out: ${lastLog.check_out || 'ABERTO'}`);
  console.log(`  Status DB: ${lastLog.status}`);
  console.log(`  isWorking (calculado): ${isWorking}`);
  
  if (isWorking) {
    console.log(`  ✅ Deveria mostrar: ENTRADA REGISTADA às ${lastLog.check_in}`);
    console.log(`  ✅ Botão: "Marcar Saída" (vermelho)`);
  } else {
    console.log(`  ✅ Deveria mostrar: SAÍDA REGISTADA às ${lastLog.check_out}`);
    console.log(`  ✅ Botão: "Marcar Entrada" (verde)`);
  }
} else {
  console.log('  ℹ️  Sem registos');
}
console.log('');

// 5. DIAGNÓSTICO
console.log('═'.repeat(60));
console.log('🔍 DIAGNÓSTICO:');
console.log('═'.repeat(60));

const hasActiveTrip = activeTrips && activeTrips.length > 0;
const hasTodayLog = todayLogs && todayLogs.length > 0;
const lastLogOpen = lastLogs && lastLogs.length > 0 && !lastLogs[0].check_out;

if (hasActiveTrip && lastLogOpen) {
  console.log('⚠️  PROBLEMA: Trip ativa + Entrada aberta');
  console.log('   Utilizador tem viagem em curso E entrada registada');
  console.log('   UI deve bloquear picagem até fechar viagem');
  console.log('   Mensagem: "Já tem um turno em curso desde as XX:XX. Registe a saída primeiro."');
} else if (hasActiveTrip) {
  console.log('✅ NORMAL: Apenas trip ativa, sem entrada aberta');
} else if (lastLogOpen) {
  console.log('✅ NORMAL: Entrada aberta, sem trip');
} else {
  console.log('✅ NORMAL: Tudo fechado');
}

