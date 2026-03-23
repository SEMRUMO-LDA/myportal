#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const USER_ID = 73;

console.log('=== VERIFICAÇÃO TRIPS USER 73 ===\n');

// Buscar trips ativos
const { data: activeTrips, error } = await supabase
  .from('trips')
  .select('*')
  .eq('driver_id', USER_ID)
  .in('status', ['IN_PROGRESS', 'STARTED'])
  .order('start_time', { ascending: false });

if (error) {
  console.error('❌ Erro ao buscar trips:', error);
  process.exit(1);
}

console.log(`🚗 Trips ativos: ${activeTrips?.length || 0}\n`);

if (activeTrips && activeTrips.length > 0) {
  activeTrips.forEach((trip, index) => {
    console.log(`  ${index + 1}. Trip ID: ${trip.id}`);
    console.log(`     Status: ${trip.status}`);
    console.log(`     Veículo: ${trip.vehicle_id}`);
    console.log(`     Início: ${trip.start_time}`);
    console.log(`     Fim: ${trip.end_time || 'EM CURSO'}`);
    console.log('');
  });

  console.log('⚠️  AVISO: Utilizador tem trips ativos!');
  console.log('   Isto pode bloquear clock-in/clock-out no Kiosk.');
} else {
  console.log('✅ Nenhum trip ativo encontrado.');
}

// Buscar todos os trips recentes (últimas 24h)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString();

const { data: recentTrips } = await supabase
  .from('trips')
  .select('*')
  .eq('driver_id', USER_ID)
  .gte('start_time', yesterdayStr)
  .order('start_time', { ascending: false })
  .limit(10);

console.log(`\n📅 Trips recentes (últimas 24h): ${recentTrips?.length || 0}\n`);

if (recentTrips && recentTrips.length > 0) {
  recentTrips.forEach((trip, index) => {
    const statusIcon = trip.status === 'COMPLETED' ? '✅' : '🚗';
    console.log(`  ${index + 1}. ${statusIcon} ${trip.status.padEnd(12)} - ${trip.start_time}`);
    console.log(`     ID: ${trip.id}`);
    console.log(`     Veículo: ${trip.vehicle_id}`);
  });
}
