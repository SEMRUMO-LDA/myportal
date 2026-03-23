#!/usr/bin/env node

/**
 * DIAGNÓSTICO: Loading Infinito no Login
 *
 * Testa:
 * 1. Supabase API está up?
 * 2. User consegue fazer login?
 * 3. RLS policies estão a bloquear?
 * 4. Timeouts?
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('   Verifica .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 DIAGNÓSTICO: Loading Infinito');
console.log('================================\n');

// Test 1: Supabase Health
console.log('📡 TEST 1: Supabase API Health');
console.log('──────────────────────────────');

try {
  const startTime = Date.now();

  // Timeout de 10 segundos
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT: 10s')), 10000)
  );

  const healthCheck = supabase.from('users').select('count', { count: 'exact', head: true });

  const result = await Promise.race([healthCheck, timeoutPromise]);

  const duration = Date.now() - startTime;

  if (result.error) {
    console.log('❌ FALHOU:', result.error.message);
  } else {
    console.log(`✅ SUPABASE UP (${duration}ms)`);
    console.log(`   Total users: ${result.count || 'N/A'}`);
  }
} catch (error) {
  console.log('🔴 CRÍTICO:', error.message);

  if (error.message.includes('TIMEOUT')) {
    console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
    console.log('   Supabase está MUITO LENTO ou DOWN');
    console.log('   Isto explica o "A carregar..." infinito');
    console.log('\n   AÇÕES:');
    console.log('   1. Verificar Supabase Dashboard');
    console.log('   2. Ver se há manutenção ativa');
    console.log('   3. Verificar limits do plano');
  }
}

console.log('\n');

// Test 2: Login Flow Simulation
console.log('🔐 TEST 2: Login Flow (Usuário 69)');
console.log('──────────────────────────────────');

try {
  const startTime = Date.now();

  // Simular o que acontece quando user clica no ID
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT: 10s')), 10000)
  );

  // Query que o Login.tsx faz
  const userQuery = supabase
    .from('users')
    .select('id, name, email, pin, role, requires_new_pin, auth_id')
    .eq('id', 69)
    .maybeSingle();

  const result = await Promise.race([userQuery, timeoutPromise]);

  const duration = Date.now() - startTime;

  if (result.error) {
    console.log('❌ QUERY FALHOU:', result.error.message);
    console.log('   Code:', result.error.code);
    console.log('   Details:', result.error.details);

    if (result.error.message.includes('RLS')) {
      console.log('\n⚠️  PROBLEMA: RLS está a bloquear!');
      console.log('   Users não conseguem fazer login');
    }
  } else if (!result.data) {
    console.log('⚠️  User 69 não encontrado');
  } else {
    console.log(`✅ QUERY OK (${duration}ms)`);
    console.log('   User:', result.data.name);
    console.log('   Role:', result.data.role);
    console.log('   Has PIN:', result.data.pin ? 'Sim' : 'Não');
    console.log('   Has auth_id:', result.data.auth_id ? 'Sim' : 'Não');

    if (duration > 2000) {
      console.log('\n⚠️  WARNING: Query muito lenta!');
      console.log(`   ${duration}ms é inaceitável para login`);
      console.log('   Causa provável: RLS policy complexa ou index missing');
    }
  }
} catch (error) {
  console.log('🔴 TIMEOUT:', error.message);
  console.log('\n⚠️  PROBLEMA CONFIRMADO:');
  console.log('   Login query está a fazer timeout (>10s)');
  console.log('   Users ficam stuck em "A carregar..."');
}

console.log('\n');

// Test 3: RLS Policies Check
console.log('🔒 TEST 3: RLS Policies');
console.log('──────────────────────');

try {
  // Tentar query sem auth (como anon)
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (error) {
    if (error.message.includes('RLS')) {
      console.log('✅ RLS ATIVO (esperado)');
      console.log('   Users table protegida');
    } else {
      console.log('❌ ERRO:', error.message);
    }
  } else if (data && data.length > 0) {
    console.log('⚠️  RLS DESATIVADO ou policy permite SELECT público');
    console.log('   Isto pode ser um problema de segurança!');
  }
} catch (error) {
  console.log('❌ Teste falhou:', error.message);
}

console.log('\n');

// Test 4: Network Speed
console.log('⚡ TEST 4: Network Speed');
console.log('────────────────────────');

try {
  const iterations = 5;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await supabase.from('users').select('count', { count: 'exact', head: true });
    const duration = Date.now() - start;
    times.push(duration);
    process.stdout.write(`  Attempt ${i+1}/${iterations}: ${duration}ms\n`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  const min = Math.min(...times);

  console.log(`\n  Average: ${avg.toFixed(0)}ms`);
  console.log(`  Min: ${min}ms`);
  console.log(`  Max: ${max}ms`);

  if (avg > 1000) {
    console.log('\n⚠️  REDE MUITO LENTA:');
    console.log(`   Média de ${avg.toFixed(0)}ms é inaceitável`);
    console.log('   Causa provável:');
    console.log('   - Supabase slow');
    console.log('   - Network congestion');
    console.log('   - Database overloaded');
  } else if (avg > 500) {
    console.log('\n⚠️  Rede aceitável mas não ideal');
  } else {
    console.log('\n✅ Rede rápida');
  }
} catch (error) {
  console.log('❌ Teste falhou:', error.message);
}

console.log('\n================================');
console.log('📊 CONCLUSÃO');
console.log('================================\n');

console.log('Se viste TIMEOUT ou >2000ms:');
console.log('  → Problema está NO SERVIDOR (Supabase)');
console.log('  → Solução: Verificar Supabase Dashboard');
console.log('  → Workaround: Aumentar timeout no código\n');

console.log('Se viste RLS errors:');
console.log('  → Problema está nas POLICIES');
console.log('  → Solução: Ajustar RLS policies');
console.log('  → Workaround: Usar service_role key (CUIDADO!)\n');

console.log('Se viste tudo OK mas users reportam problema:');
console.log('  → Problema intermitente ou específico de users');
console.log('  → Verificar logs do Supabase');
console.log('  → Pedir a users para limpar cache (Ctrl+Shift+R)\n');
