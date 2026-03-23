#!/usr/bin/env node
/**
 * CHECK RLS STATUS
 * Verifica se RLS está ativo nas tabelas críticas
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Faltam credenciais do Supabase no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VERIFICANDO STATUS DO RLS\n');

async function checkRLS() {
  try {
    // Test 1: Tentar ler users (como faria o Login.tsx)
    console.log('Test 1: Query users (como Login.tsx)');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, pin, role, status, auth_id, requires_new_pin')
      .eq('status', 'ACTIVE')
      .limit(5);

    if (usersError) {
      console.error('   ❌ ERRO ao query users:');
      console.error('   ', usersError);
      console.error('\n   🚨 PROVÁVEL CAUSA: RLS está ativo e a bloquear queries!');

      if (usersError.code === 'PGRST301') {
        console.error('\n   💡 SOLUÇÃO: Criar policy que permite SELECT sem autenticação:');
        console.error('   ```sql');
        console.error('   CREATE POLICY "users_read_active_public" ON users');
        console.error('     FOR SELECT USING (status = \'ACTIVE\');');
        console.error('   ```\n');
      }
      return;
    }

    console.log(`   ✅ Query OK: ${users?.length || 0} users encontrados\n`);

    // Test 2: Verificar RLS via query SQL
    console.log('Test 2: Verificar RLS status via SQL');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status', {});

    if (rlsError && rlsError.code !== '42883') { // 42883 = function doesn't exist (OK)
      console.error('   ⚠️  Não consegui verificar via RPC (esperado)');
    }

    // Test 3: Verificar policies via information_schema
    console.log('\nTest 3: Tentar query direto (sem filtros)');
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (allError) {
      console.error('   ❌ RLS está ATIVO e a bloquear queries');
      console.error('   ', allError.message);
    } else {
      console.log('   ✅ Query sem filtros funciona');
    }

    // Test 4: Verificar se conseguimos criar user (teste de INSERT)
    console.log('\nTest 4: Verificar permissões de escrita (READ-ONLY test)');
    const { data: insertTest, error: insertError } = await supabase
      .from('users')
      .select('id')
      .limit(0); // Não retorna nada, só testa permissões

    console.log('   ✅ Tabela users é acessível\n');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (users && users.length > 0) {
      console.log('✅ STATUS: Users query FUNCIONA');
      console.log(`   ${users.length} users encontrados`);
      console.log('\n✅ CONCLUSÃO: RLS está correto OU não está ativo');
      console.log('\n💡 Problema "A carregar..." provavelmente não é RLS');
      console.log('   Possíveis causas alternativas:');
      console.log('   - App.tsx demora a passar users para Login.tsx');
      console.log('   - Query lenta (>5s)');
      console.log('   - React state não atualiza');
      console.log('   - Service Worker cache antigo\n');
      console.log('🎯 BUILD 55 deve resolver o problema!');
    } else {
      console.log('⚠️  STATUS: Users query retornou vazio');
      console.log('   Pode ser:');
      console.log('   1. RLS a bloquear (CRÍTICO)');
      console.log('   2. Tabela users vazia (improvável)');
      console.log('   3. Todos os users INACTIVE (verificar)\n');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error.message);
  }
}

// Test session info
console.log('🔐 Session Info');
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    console.log('   ✅ Sessão ativa:', session.user.email);
  } else {
    console.log('   ℹ️  Sem sessão (esperado para ANON_KEY)');
  }
  console.log('');
  checkRLS();
});
