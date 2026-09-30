import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const USER_ID = 73;
const PIN = '000000';
const USER_EMAIL = 'tiago@semrumo.eu';
const NUM_CYCLES = 25;

console.log('===============================================================');
console.log(`🚀 INICIANDO TESTE DE EXAUSTÃO - USER ${USER_ID} (PIN: ${PIN})`);
console.log(`📊 Número de ciclos completos: ${NUM_CYCLES}`);
console.log(`🎯 Operações por ciclo: Lookup ID -> Auth PIN -> Fetch Session -> ClockIn -> Verify -> ClockOut -> Verify -> Logout`);
console.log('===============================================================\n');

const metrics = {
  lookup: [],
  auth: [],
  clockIn: [],
  clockOut: [],
  logout: [],
  totalCycle: [],
  errors: []
};

const createdTestLogIds = [];

function stats(arr) {
  if (arr.length === 0) return { min: 0, max: 0, avg: 0, p95: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / sorted.length);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
  return { min, max, avg, p95 };
}

async function runSingleCycle(cycleIndex) {
  const cycleStart = performance.now();
  const tag = `[Ciclo #${cycleIndex + 1}/${NUM_CYCLES}]`;

  // 1. LOOKUP USER BY ID
  const t0 = performance.now();
  const { data: userLookup, error: lookupErr } = await supabase
    .from('users')
    .select('id, name, email, role, status, pin, requires_new_pin')
    .eq('id', USER_ID)
    .eq('status', 'ACTIVE')
    .single();

  const lookupTime = Math.round(performance.now() - t0);
  metrics.lookup.push(lookupTime);

  if (lookupErr || !userLookup) {
    throw new Error(`Falha no lookup do user ${USER_ID}: ${lookupErr?.message}`);
  }

  // 2. AUTHENTICATION WITH SUPABASE AUTH
  const t1 = performance.now();
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: userLookup.email,
    password: PIN
  });
  const authTime = Math.round(performance.now() - t1);
  metrics.auth.push(authTime);

  if (authErr || !authData.session) {
    throw new Error(`Falha no login com PIN: ${authErr?.message}`);
  }

  const tokenClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${authData.session.access_token}` }
    }
  });

  // 3. CLOCK-IN (Registo de Entrada)
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const checkInTime = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const t2 = performance.now();
  const logPayload = {
    user_id: USER_ID,
    date: dateStr,
    check_in: checkInTime,
    check_in_location: `Teste Exaustão Ciclo ${cycleIndex + 1}`,
    check_in_ip: '127.0.0.1',
    status: 'NORMAL'
  };

  const { data: logInserted, error: insertErr } = await tokenClient
    .from('time_logs')
    .insert(logPayload)
    .select()
    .single();

  const clockInTimeElapsed = Math.round(performance.now() - t2);
  metrics.clockIn.push(clockInTimeElapsed);

  if (insertErr || !logInserted) {
    throw new Error(`Falha no registo de entrada: ${insertErr?.message}`);
  }
  createdTestLogIds.push(logInserted.id);

  // Small delay to simulate work interval between punch in and punch out
  await new Promise(r => setTimeout(r, 100));

  // 4. CLOCK-OUT (Registo de Saída)
  const checkOutDate = new Date();
  const checkOutTime = checkOutDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const t3 = performance.now();
  // Calculate total hours
  const totalHours = 0.05; // ~3 minutes simulated
  const { data: logUpdated, error: updateErr } = await tokenClient
    .from('time_logs')
    .update({
      check_out: checkOutTime,
      check_out_location: `Saída Teste Ciclo ${cycleIndex + 1}`,
      check_out_ip: '127.0.0.1',
      total_hours: totalHours
    })
    .eq('id', logInserted.id)
    .select()
    .single();

  const clockOutTimeElapsed = Math.round(performance.now() - t3);
  metrics.clockOut.push(clockOutTimeElapsed);

  if (updateErr || !logUpdated || !logUpdated.check_out) {
    throw new Error(`Falha no registo de saída: ${updateErr?.message}`);
  }

  // 5. LOGOUT
  const t4 = performance.now();
  await supabase.auth.signOut();
  const logoutTime = Math.round(performance.now() - t4);
  metrics.logout.push(logoutTime);

  const totalCycleTime = Math.round(performance.now() - cycleStart);
  metrics.totalCycle.push(totalCycleTime);

  console.log(`${tag} ✅ Sucesso! Lookup: ${lookupTime}ms | Auth: ${authTime}ms | Entrada: ${clockInTimeElapsed}ms | Saída: ${clockOutTimeElapsed}ms | Logout: ${logoutTime}ms | Total: ${totalCycleTime}ms`);
}

async function runEdgeCases() {
  console.log('\n---------------------------------------------------------------');
  console.log('🧪 TESTES DE CASOS LIMITE E RESILIÊNCIA');
  console.log('---------------------------------------------------------------');

  // Edge Case 1: Wrong PIN attempt
  console.log('1. Teste de PIN incorreto para User 73:');
  const tBad = performance.now();
  const { data: badAuth, error: badErr } = await supabase.auth.signInWithPassword({
    email: USER_EMAIL,
    password: 'WRONG_PASSWORD_999'
  });
  const badTime = Math.round(performance.now() - tBad);
  if (badErr && !badAuth.session) {
    console.log(`   ✅ Rejeição correta com erro esperado: "${badErr.message}" em ${badTime}ms`);
  } else {
    console.error('   ❌ FALHA: PIN incorreto não foi rejeitado!');
    metrics.errors.push('PIN incorreto não rejeitado');
  }

  // Edge Case 2: Inactive or non-existent user lookup
  console.log('2. Teste de lookup de utilizador inexistente (-999):');
  const { data: nonExistent, error: nonExistentErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', -999)
    .maybeSingle();
  if (!nonExistent) {
    console.log('   ✅ Corretamente retornado null para utilizador inexistente');
  } else {
    console.error('   ❌ Utilizador fantasma retornado');
  }

  // Edge Case 3: Rapid Concurrent Logins (5 parallel logins)
  console.log('3. Teste de 5 logins concorrentes em paralelo com User 73:');
  const tConc = performance.now();
  const parallelLogins = await Promise.allSettled(
    Array.from({ length: 5 }).map((_, i) =>
      supabase.auth.signInWithPassword({
        email: USER_EMAIL,
        password: PIN
      })
    )
  );
  const concTime = Math.round(performance.now() - tConc);
  const successCount = parallelLogins.filter(p => p.status === 'fulfilled' && p.value?.data?.session).length;
  console.log(`   ✅ ${successCount}/5 logins em paralelo bem-sucedidos em ${concTime}ms (média: ${Math.round(concTime/5)}ms/op)`);

  // Edge Case 4: Verify time log query with numeric and string ID
  console.log('4. Teste de compatibilidade de tipos ID (number vs string) na tabela time_logs:');
  const { data: numQuery } = await supabase.from('time_logs').select('id, user_id').eq('user_id', 73).limit(2);
  const { data: strQuery } = await supabase.from('time_logs').select('id, user_id').eq('user_id', '73').limit(2);
  console.log(`   ✅ Consulta com number (73): ${numQuery?.length || 0} registos | Consulta com string ('73'): ${strQuery?.length || 0} registos`);
}

async function cleanup() {
  console.log('\n🧹 Limpeza de registos temporários gerados no teste...');
  if (createdTestLogIds.length > 0) {
    const { error: delErr } = await supabase
      .from('time_logs')
      .delete()
      .in('id', createdTestLogIds);
    if (delErr) {
      console.warn('⚠️ Aviso ao limpar registos:', delErr.message);
    } else {
      console.log(`✅ ${createdTestLogIds.length} registos de teste eliminados com sucesso.`);
    }
  }
}

async function main() {
  const overallStart = performance.now();

  for (let i = 0; i < NUM_CYCLES; i++) {
    try {
      await runSingleCycle(i);
    } catch (err) {
      console.error(`❌ [Ciclo #${i + 1}] FALHA:`, err.message);
      metrics.errors.push(`Ciclo ${i + 1}: ${err.message}`);
    }
  }

  await runEdgeCases();
  await cleanup();

  const totalDuration = Math.round(performance.now() - overallStart);

  console.log('\n===============================================================');
  console.log('📊 RELATÓRIO FINAL DO TESTE DE EXAUSTÃO - USER 73');
  console.log('===============================================================');
  console.log(`Tempo Total de Execução: ${totalDuration}ms (~${(totalDuration / 1000).toFixed(1)}s)`);
  console.log(`Ciclos Executados: ${NUM_CYCLES}`);
  console.log(`Ciclos com Sucesso: ${NUM_CYCLES - metrics.errors.length}/${NUM_CYCLES} (${(((NUM_CYCLES - metrics.errors.length) / NUM_CYCLES) * 100).toFixed(1)}%)`);
  console.log(`Falhas Registadas: ${metrics.errors.length}`);

  const sLookup = stats(metrics.lookup);
  const sAuth = stats(metrics.auth);
  const sClockIn = stats(metrics.clockIn);
  const sClockOut = stats(metrics.clockOut);
  const sLogout = stats(metrics.logout);
  const sCycle = stats(metrics.totalCycle);

  console.log('\n--- LATÊNCIAS DETALHADAS (ms) ---');
  console.log(`1. Lookup de Colaborador : Média = ${sLookup.avg}ms | Min = ${sLookup.min}ms | Max = ${sLookup.max}ms | p95 = ${sLookup.p95}ms`);
  console.log(`2. Autenticação PIN Supabase : Média = ${sAuth.avg}ms | Min = ${sAuth.min}ms | Max = ${sAuth.max}ms | p95 = ${sAuth.p95}ms`);
  console.log(`3. Registo de Entrada (ClockIn) : Média = ${sClockIn.avg}ms | Min = ${sClockIn.min}ms | Max = ${sClockIn.max}ms | p95 = ${sClockIn.p95}ms`);
  console.log(`4. Registo de Saída (ClockOut) : Média = ${sClockOut.avg}ms | Min = ${sClockOut.min}ms | Max = ${sClockOut.max}ms | p95 = ${sClockOut.p95}ms`);
  console.log(`5. Logout (SignOut) : Média = ${sLogout.avg}ms | Min = ${sLogout.min}ms | Max = ${sLogout.max}ms | p95 = ${sLogout.p95}ms`);
  console.log(`⭐ CICLO COMPLETO DE VIDA : Média = ${sCycle.avg}ms | Min = ${sCycle.min}ms | Max = ${sCycle.max}ms | p95 = ${sCycle.p95}ms`);
  console.log('===============================================================');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
