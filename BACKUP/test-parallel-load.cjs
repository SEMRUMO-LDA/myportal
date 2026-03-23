const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  const userId = 73;

  console.log('🏁 Comparando: SEQUENCIAL vs PARALELO\n');
  console.log('=' .repeat(60));

  // ===== TESTE 1: SEQUENCIAL (ANTES) =====
  console.log('\n📊 TESTE 1: Carregamento SEQUENCIAL (método antigo)');
  console.log('-'.repeat(60));

  const seq_start = Date.now();

  // 1. Session check
  console.time('  ├─ Session Check');
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 16);

  const session = await supabase
    .from('time_logs')
    .select(`*, user:users!time_logs_user_id_fkey (id, name, email, department)`)
    .is('check_out', null)
    .neq('status', 'ANOMALY')
    .eq('user_id', userId);
  console.timeEnd('  ├─ Session Check');

  // 2. Trip check
  console.time('  ├─ Active Trip');
  const trip = await supabase
    .from('trips')
    .select(`*, vehicle:vehicles!trips_vehicle_id_fkey (*)`)
    .eq('user_id', userId)
    .is('end_date', null)
    .maybeSingle();
  console.timeEnd('  ├─ Active Trip');

  // 3. Vehicles
  console.time('  └─ Vehicles');
  const vehicles = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'AVAILABLE')
    .order('plate', { ascending: true });
  console.timeEnd('  └─ Vehicles');

  const seq_total = Date.now() - seq_start;
  console.log(`\n⏱️  Total Sequencial: ${seq_total}ms`);

  // ===== TESTE 2: PARALELO (DEPOIS) =====
  console.log('\n📊 TESTE 2: Carregamento PARALELO (método novo)');
  console.log('-'.repeat(60));

  const par_start = Date.now();

  const [sessionP, tripP, vehiclesP] = await Promise.all([
    supabase
      .from('time_logs')
      .select(`*, user:users!time_logs_user_id_fkey (id, name, email, department)`)
      .is('check_out', null)
      .neq('status', 'ANOMALY')
      .eq('user_id', userId),

    supabase
      .from('trips')
      .select(`*, vehicle:vehicles!trips_vehicle_id_fkey (*)`)
      .eq('user_id', userId)
      .is('end_date', null)
      .maybeSingle(),

    supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'AVAILABLE')
      .order('plate', { ascending: true})
  ]);

  const par_total = Date.now() - par_start;
  console.log(`  └─ Todas as queries em paralelo`);
  console.log(`\n⏱️  Total Paralelo: ${par_total}ms`);

  // ===== COMPARAÇÃO =====
  console.log('\n' + '='.repeat(60));
  console.log('📈 ANÁLISE DE PERFORMANCE\n');

  const improvement = ((seq_total - par_total) / seq_total * 100).toFixed(1);
  const speedup = (seq_total / par_total).toFixed(2);

  console.log(`  ❌ Sequencial: ${seq_total}ms`);
  console.log(`  ✅ Paralelo:   ${par_total}ms`);
  console.log(`\n  🚀 Melhoria:   ${improvement}% mais rápido`);
  console.log(`  ⚡ Speedup:    ${speedup}x`);
  console.log(`  💾 Economizado: ${seq_total - par_total}ms\n`);

  if (improvement > 30) {
    console.log('  ✨ EXCELENTE! Ganho de performance significativo!');
  } else if (improvement > 15) {
    console.log('  ✔️  BOM! Melhoria notável de performance.');
  } else {
    console.log('  ⚠️  Ganho modesto. Pode haver gargalos de rede.');
  }

  console.log('='.repeat(60));
})();
