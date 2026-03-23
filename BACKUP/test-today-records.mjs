#!/usr/bin/env node

/**
 * Diagnóstico: Verificar registos de hoje
 *
 * Este script verifica:
 * 1. Se existem time_logs de hoje na BD
 * 2. Qual o filtro de data que a app está a usar
 * 3. Quantos registos estão a ser carregados
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseToday() {
  console.log('\n🔍 Diagnóstico: Registos de Hoje\n');
  console.log('='.repeat(60));

  try {
    // 1. Data de hoje
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    console.log(`\n📅 Data de Hoje: ${todayStr}`);
    console.log(`⏰ Hora Atual: ${today.toISOString()}`);

    // 2. Calcular filtro (como no App.tsx)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateFilter = yesterday.toISOString().split('T')[0];
    console.log(`\n📅 Filtro da App (>= yesterday): ${dateFilter}`);

    // 3. Buscar time_logs de HOJE
    console.log(`\n🔍 A buscar registos de HOJE (${todayStr})...`);
    const { data: todayLogs, error: todayError } = await supabase
      .from('time_logs')
      .select('id, user_id, date, check_in, check_out, status')
      .eq('date', todayStr)
      .order('check_in', { ascending: false });

    if (todayError) {
      console.error('❌ Erro ao buscar registos de hoje:', todayError);
    } else {
      console.log(`✅ Encontrados ${todayLogs?.length || 0} registos de HOJE`);

      if (todayLogs && todayLogs.length > 0) {
        console.log('\n📋 Registos de hoje:');
        todayLogs.slice(0, 5).forEach(log => {
          console.log(`   • User ${log.user_id}: ${log.check_in} - ${log.check_out || 'em aberto'} (${log.status})`);
        });
        if (todayLogs.length > 5) {
          console.log(`   ... e mais ${todayLogs.length - 5} registos`);
        }
      } else {
        console.log('⚠️  Nenhum registo encontrado para hoje!');
      }
    }

    // 4. Buscar time_logs com o FILTRO da App (>= yesterday)
    console.log(`\n🔍 A buscar registos COM FILTRO da App (>= ${dateFilter})...`);
    const { data: filteredLogs, error: filteredError, count } = await supabase
      .from('time_logs')
      .select('id, user_id, date, check_in, check_out, status', { count: 'exact' })
      .gte('date', dateFilter)
      .order('date', { ascending: false })
      .order('check_in', { ascending: false })
      .limit(500);

    if (filteredError) {
      console.error('❌ Erro ao buscar com filtro:', filteredError);
    } else {
      console.log(`✅ Encontrados ${filteredLogs?.length || 0} registos (total na query: ${count})`);

      if (filteredLogs && filteredLogs.length > 0) {
        // Agrupar por data
        const byDate = {};
        filteredLogs.forEach(log => {
          if (!byDate[log.date]) byDate[log.date] = 0;
          byDate[log.date]++;
        });

        console.log('\n📊 Registos por data:');
        Object.keys(byDate).sort().reverse().slice(0, 7).forEach(date => {
          const isToday = date === todayStr;
          console.log(`   ${isToday ? '👉' : '  '} ${date}: ${byDate[date]} registos ${isToday ? '← HOJE' : ''}`);
        });
      }
    }

    // 5. Verificar se app está a carregar hoje
    console.log('\n🔍 Análise:');

    const todayInFiltered = filteredLogs?.some(log => log.date === todayStr);

    if (todayLogs && todayLogs.length > 0) {
      if (todayInFiltered) {
        console.log('✅ Registos de HOJE existem E estão no filtro da app');
        console.log('✅ A app DEVE mostrar os registos de hoje');
      } else {
        console.log('⚠️  Registos de HOJE existem MAS não estão no filtro da app');
        console.log('❌ Problema: Limite de 500 rows ou filtro de date incorreto');
      }
    } else {
      console.log('⚠️  Não existem registos de HOJE na base de dados');
      console.log('ℹ️  Isto é normal se ainda não houve picagens hoje');
    }

    // 6. Verificar timezone do servidor vs local
    console.log('\n🌍 Timezone Check:');
    const serverDate = new Date().toISOString();
    const localDate = new Date().toString();
    console.log(`   Servidor (UTC): ${serverDate}`);
    console.log(`   Local: ${localDate}`);

    const timezoneOffset = new Date().getTimezoneOffset();
    console.log(`   Timezone Offset: ${timezoneOffset} minutos (${timezoneOffset / 60} horas)`);

    if (Math.abs(timezoneOffset) > 0) {
      console.log(`   ℹ️  Diferença de ${Math.abs(timezoneOffset / 60)}h entre UTC e timezone local`);
    }

    // 7. Recomendações
    console.log('\n💡 Recomendações:');

    if (!todayLogs || todayLogs.length === 0) {
      console.log('   1. Verificar se já houve picagens hoje');
      console.log('   2. Verificar se data está correta no time_logs');
    } else if (!todayInFiltered) {
      console.log('   1. Aumentar limite de 500 para 1000 na query');
      console.log('   2. Verificar ordem da query (mais recentes primeiro)');
    } else {
      console.log('   ✅ Tudo parece estar correto!');
      console.log('   ℹ️  Se não vês registos na UI, pode ser:');
      console.log('      - Cache do browser (Ctrl+Shift+R)');
      console.log('      - Filtro de user_id (users normais só veem os seus)');
      console.log('      - Data/hora do browser diferente do servidor');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico Completo\n');

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err);
  }
}

// Run
diagnoseToday();
