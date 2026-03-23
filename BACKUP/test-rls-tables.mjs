import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltam variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tabelas críticas de configuração
const configTables = [
  'departments',
  'locations',
  'schedule_templates',
  'schedule_periods',
  'holidays',
  'leave_types',
  'anomaly_types',
  'job_roles',
  'permissions',
  'role_permissions'
];

async function testTableAccess() {
  console.log('=== TESTE DE ACESSO ÀS TABELAS DE CONFIGURAÇÃO ===\n');
  console.log('Testando acesso SEM autenticação (ANON KEY)...\n');

  const results = [];

  for (const table of configTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(5);

      if (error) {
        results.push({
          table,
          status: '❌',
          error: error.message,
          count: 0,
          data: null
        });
      } else {
        results.push({
          table,
          status: '✅',
          error: null,
          count: count || 0,
          data: data
        });
      }
    } catch (err) {
      results.push({
        table,
        status: '❌',
        error: err.message,
        count: 0,
        data: null
      });
    }
  }

  // Mostrar resultados
  console.log('RESULTADOS:\n');

  const failed = results.filter(r => r.status === '❌');
  const success = results.filter(r => r.status === '✅');

  if (success.length > 0) {
    console.log('✅ TABELAS ACESSÍVEIS:\n');
    success.forEach(r => {
      console.log(`  ${r.status} ${r.table.padEnd(25)} - ${r.count} registos`);
      if (r.count === 0) {
        console.log(`      ⚠️  Tabela vazia - sem dados`);
      }
    });
    console.log('');
  }

  if (failed.length > 0) {
    console.log('❌ TABELAS COM PROBLEMAS:\n');
    failed.forEach(r => {
      console.log(`  ${r.status} ${r.table.padEnd(25)} - ERRO`);
      console.log(`      Mensagem: ${r.error}`);
      if (r.error?.includes('RLS') || r.error?.includes('policy') || r.error?.includes('permission denied')) {
        console.log(`      🔒 PROBLEMA DE RLS - Política de segurança a bloquear acesso`);
      }
    });
    console.log('');
  }

  // Agora testar COM autenticação
  console.log('\n=== TESTE COM AUTENTICAÇÃO (Utilizador 73) ===\n');

  // Fazer login como utilizador 73
  console.log('Tentando autenticar como tiagopacheco@me.com...');

  // Nota: Para este teste funcionar, precisamos da password
  // Por agora, vamos apenas mostrar o que seria necessário
  console.log('⚠️  Para testar com autenticação, forneça a password do utilizador 73.');
  console.log('   Execute: node test-rls-authenticated.mjs');
  console.log('');

  // Diagnóstico final
  console.log('\n=== DIAGNÓSTICO ===\n');

  if (failed.length === 0) {
    console.log('✅ Todas as tabelas estão acessíveis sem autenticação (RLS desabilitado ou políticas públicas)');
  } else if (failed.length === configTables.length) {
    console.log('❌ CRÍTICO: Nenhuma tabela acessível - RLS bloqueando TUDO');
    console.log('\nSoluções possíveis:');
    console.log('  1. Adicionar políticas RLS públicas para leitura em tabelas de configuração');
    console.log('  2. Desabilitar RLS temporariamente para tabelas de configuração');
    console.log('  3. Verificar se as políticas existentes estão corretas');
    console.log('\nPróximos passos:');
    console.log('  • Ver ficheiro: APPLY_THIS_TO_SUPABASE.sql');
    console.log('  • Aplicar políticas RLS corretas no Supabase Dashboard');
  } else {
    console.log('⚠️  PROBLEMA PARCIAL: Algumas tabelas bloqueadas por RLS');
    console.log('\nTabelas afetadas:', failed.map(r => r.table).join(', '));
    console.log('\nRecomendação:');
    console.log('  • Aplicar políticas RLS específicas para estas tabelas');
    console.log('  • Verificar se precisam de autenticação ou podem ser públicas');
  }

  // Gerar SQL para corrigir
  if (failed.length > 0) {
    console.log('\n=== SQL PARA CORRIGIR ===\n');
    console.log('-- Execute este SQL no Supabase SQL Editor:\n');

    failed.forEach(r => {
      console.log(`-- Permitir leitura pública em ${r.table}`);
      console.log(`CREATE POLICY "Enable read access for all users" ON ${r.table}`);
      console.log(`  FOR SELECT USING (true);`);
      console.log('');
    });
  }
}

testTableAccess();
