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

async function debugAuth() {
  console.log('=== DEBUG AUTENTICAÇÃO UTILIZADOR 73 ===\n');

  // 1. Buscar dados do user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 73)
    .single();

  if (userError || !user) {
    console.error('❌ Erro ao buscar utilizador:', userError);
    return;
  }

  console.log('1️⃣ DADOS DO UTILIZADOR:');
  console.log('   ID:', user.id);
  console.log('   Nome:', user.name);
  console.log('   Email:', user.email);
  console.log('   Role:', `"${user.role}"`);
  console.log('   Role (bytes):', Buffer.from(user.role).toString('hex'));
  console.log('   Auth ID:', user.auth_id);
  console.log('');

  // 2. Buscar role na tabela job_roles
  const { data: jobRole, error: jobRoleError } = await supabase
    .from('job_roles')
    .select('*')
    .eq('name', user.role)
    .single();

  console.log('2️⃣ ROLE NA TABELA JOB_ROLES:');
  if (jobRoleError) {
    console.error('   ❌ Erro ao buscar role:', jobRoleError);
    console.log('   Tentando buscar com case insensitive...');

    const { data: allRoles } = await supabase
      .from('job_roles')
      .select('*');

    console.log('   Roles disponíveis:');
    allRoles?.forEach(r => {
      const match = r.name.toLowerCase() === user.role.toLowerCase();
      console.log(`     - "${r.name}" (ID: ${r.id}) ${match ? '✅ MATCH!' : ''}`);
    });
  } else if (jobRole) {
    console.log('   ✅ Role encontrada:', jobRole.name);
    console.log('   ID:', jobRole.id);
    console.log('');

    // 3. Buscar permissões
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission_code')
      .eq('role_id', jobRole.id);

    console.log('3️⃣ PERMISSÕES DO ROLE:');
    if (permError) {
      console.error('   ❌ Erro ao buscar permissões:', permError);
    } else if (!permissions || permissions.length === 0) {
      console.log('   ⚠️  Nenhuma permissão encontrada!');
    } else {
      console.log(`   ✅ ${permissions.length} permissões encontradas:`);
      permissions.forEach(p => {
        console.log(`     - ${p.permission_code}`);
      });

      // Verificar se tem VIEW_ADMIN
      const hasViewAdmin = permissions.some(p => p.permission_code === 'VIEW_ADMIN');
      console.log('');
      console.log(`   VIEW_ADMIN: ${hasViewAdmin ? '✅ SIM' : '❌ NÃO'}`);
    }
  }
  console.log('');

  // 4. Verificar conta no Supabase Auth
  console.log('4️⃣ CONTA NO SUPABASE AUTH:');
  if (!user.auth_id) {
    console.log('   ❌ Utilizador não tem auth_id!');
  } else {
    console.log('   ✅ Auth ID:', user.auth_id);
    console.log('   Email:', user.email);
    console.log('');
    console.log('   ℹ️  Para testar login:');
    console.log(`   Email: ${user.email}`);
    console.log('   Password: [a password que foi configurada]');
  }
  console.log('');

  // 5. Simular lógica do AuthContext
  console.log('5️⃣ SIMULAÇÃO DA LÓGICA DO AUTHCONTEXT:');

  const normalizeRoleName = (role) => {
    if (!role) return '';
    return role
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const isAdminRole = (normalized) => {
    const adminVariants = [
      'admin',
      'administrador',
      'administrator',
      'responsavel de departamento',
      'diretor',
      'director',
      'ceo',
      'rh'
    ];
    return adminVariants.includes(normalized);
  };

  const normalizedRole = normalizeRoleName(user.role);
  const isAdmin = isAdminRole(normalizedRole);

  console.log('   Role original:', `"${user.role}"`);
  console.log('   Role normalizada:', `"${normalizedRole}"`);
  console.log('   É considerado Admin?', isAdmin ? '✅ SIM' : '❌ NÃO');
  console.log('');

  // 6. Diagnóstico final
  console.log('=== DIAGNÓSTICO FINAL ===');

  const issues = [];

  if (!user.auth_id) {
    issues.push('❌ CRÍTICO: Falta auth_id - não pode fazer login');
  }

  if (!user.email) {
    issues.push('❌ CRÍTICO: Falta email - não pode fazer login');
  }

  if (!jobRole) {
    issues.push('⚠️  Role não encontrada na tabela job_roles');
  } else if (!permissions || permissions.length === 0) {
    issues.push('⚠️  Role não tem permissões configuradas');
  } else {
    const hasViewAdmin = permissions.some(p => p.permission_code === 'VIEW_ADMIN');
    if (!hasViewAdmin) {
      issues.push('❌ Role não tem permissão VIEW_ADMIN');
    }
  }

  if (!isAdmin) {
    issues.push('⚠️  Role não é reconhecida como Admin pelo authUtils');
  }

  if (issues.length > 0) {
    console.log('\n❌ PROBLEMAS ENCONTRADOS:');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('\n✅ TUDO CONFIGURADO CORRETAMENTE!');
    console.log('\nSe ainda não consegue fazer login, o problema pode ser:');
    console.log('  1. Password incorreta');
    console.log('  2. Problema no browser (cache, cookies)');
    console.log('  3. Erro no código do frontend');
    console.log('\nSugestões:');
    console.log('  - Abrir console do browser (F12) e verificar erros');
    console.log('  - Testar em modo incógnito');
    console.log('  - Fazer reset da password se necessário');
  }
}

debugAuth();
