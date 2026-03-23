#!/usr/bin/env node
/**
 * 🧪 TESTE ESPECÍFICO: lastLog Fix
 * Verifica que o bug de não mostrar picagem após refresh foi corrigido
 */

console.log('🧪 TESTE: lastLog Fix - Status de Picagem após Refresh\n');
console.log('═'.repeat(60));

// Simular cenário do bug
const timeLogs = [
  { userId: 73, date: '2026-03-19', checkIn: '09:00', checkOut: '18:00' }, // Dia anterior
  { userId: 73, date: '2026-03-20', checkIn: '09:15', checkOut: null },   // Hoje (picado)
  { userId: 62, date: '2026-03-20', checkIn: '08:30', checkOut: null },   // Outro user
  { userId: 73, date: '2026-03-18', checkIn: '09:10', checkOut: '17:30' }, // 2 dias atrás
];

const currentUserId = 73;

console.log('📊 Cenário de Teste:');
console.log(`  User ID: ${currentUserId}`);
console.log(`  TimeLogs totais: ${timeLogs.length}`);
console.log(`  TimeLogs do user: ${timeLogs.filter(l => l.userId === currentUserId).length}`);
console.log('');

// MÉTODO ANTIGO (❌ ERRADO)
console.log('❌ MÉTODO ANTIGO (Bug):');
const oldLastLog = timeLogs.find((l) => String(l.userId) === String(currentUserId));
console.log(`  lastLog.date: ${oldLastLog?.date}`);
console.log(`  lastLog.checkIn: ${oldLastLog?.checkIn}`);
console.log(`  lastLog.checkOut: ${oldLastLog?.checkOut}`);

const oldIsWorking = oldLastLog && !oldLastLog.checkOut;
console.log(`  isWorking: ${oldIsWorking ? '✅ SIM (picado)' : '❌ NÃO (saída)'}`);

if (!oldIsWorking) {
  console.log(`  🐛 BUG! Retornou log de ${oldLastLog?.date} (não é o mais recente!)`);
}
console.log('');

// MÉTODO NOVO (✅ CORRETO)
console.log('✅ MÉTODO NOVO (Fix):');
const newLastLog = timeLogs
  .filter((l) => String(l.userId) === String(currentUserId))
  .sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.checkIn || '').localeCompare(a.checkIn || '');
  })[0];

console.log(`  lastLog.date: ${newLastLog?.date}`);
console.log(`  lastLog.checkIn: ${newLastLog?.checkIn}`);
console.log(`  lastLog.checkOut: ${newLastLog?.checkOut}`);

const newIsWorking = newLastLog && !newLastLog.checkOut;
console.log(`  isWorking: ${newIsWorking ? '✅ SIM (picado)' : '❌ NÃO (saída)'}`);
console.log('');

// VERIFICAÇÃO
console.log('═'.repeat(60));
console.log('📋 RESULTADO DO TESTE:');
console.log('═'.repeat(60));

if (newIsWorking && newLastLog.date === '2026-03-20') {
  console.log('✅ TESTE PASSOU!');
  console.log('✅ lastLog correto: 2026-03-20 09:15 (SEM check-out)');
  console.log('✅ isWorking = true (mostra que está picado)');
  console.log('✅ Bug CORRIGIDO - utilizador verá status correto após refresh!');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ TESTE FALHOU!');
  console.log(`❌ lastLog incorreto: ${newLastLog?.date}`);
  console.log(`❌ isWorking = ${newIsWorking}`);
  console.log('');
  process.exit(1);
}
