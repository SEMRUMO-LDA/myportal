const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  const userId = 73;
  const startTime = Date.now();

  console.log('🏁 Starting Kiosk Load Simulation for User', userId);
  console.log('─────────────────────────────────────────────────\n');

  // 1. Session Check
  console.time('1️⃣  Session Check');
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 16);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const sessionQuery = await supabase
    .from('time_logs')
    .select(`
      *,
      user:users!time_logs_user_id_fkey (id, name, email, department)
    `)
    .is('check_out', null)
    .neq('status', 'ANOMALY')
    .eq('user_id', userId);
  console.timeEnd('1️⃣  Session Check');
  console.log('   Result:', sessionQuery.data?.length || 0, 'open sessions\n');

  // 2. Active Trip Check
  console.time('2️⃣  Active Trip Check');
  const tripQuery = await supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles!trips_vehicle_id_fkey (*)
    `)
    .eq('user_id', userId)
    .is('end_date', null)
    .maybeSingle();
  console.timeEnd('2️⃣  Active Trip Check');
  console.log('   Result:', tripQuery.data ? 'Has active trip' : 'No active trip\n');

  // 3. Available Vehicles (if no active trip)
  if (!tripQuery.data) {
    console.time('3️⃣  Available Vehicles');
    const vehiclesQuery = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'AVAILABLE')
      .order('plate', { ascending: true });
    console.timeEnd('3️⃣  Available Vehicles');
    console.log('   Result:', vehiclesQuery.data?.length || 0, 'vehicles\n');
  }

  const totalTime = Date.now() - startTime;
  console.log('─────────────────────────────────────────────────');
  console.log('🏁 Total Load Time:', totalTime + 'ms');
  console.log('─────────────────────────────────────────────────');

  if (totalTime > 2000) {
    console.log('⚠️  WARNING: Load time exceeds 2 seconds!');
  } else if (totalTime > 1000) {
    console.log('⚡ Acceptable performance (1-2s)');
  } else {
    console.log('✅ Excellent performance (<1s)');
  }
})();
