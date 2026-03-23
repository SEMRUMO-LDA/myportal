import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltam variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUser73() {
  console.log('=== TESTE DO UTILIZADOR 73 ===\n');

  try {
    // 1. Verificar dados do utilizador na tabela users
    console.log('1️⃣ Verificando dados do utilizador 73 na tabela users...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 73)
      .single();

    if (userError) {
      console.error('❌ Erro ao buscar utilizador:', userError);
      return;
    }

    if (!userData) {
      console.error('❌ Utilizador 73 não encontrado!');
      return;
    }

    console.log('✅ Utilizador encontrado:');
    console.log('   - ID:', userData.id);
    console.log('   - Nome:', userData.name);
    console.log('   - Email:', userData.email);
    console.log('   - Role:', userData.role);
    console.log('   - Auth ID:', userData.auth_id);
    console.log('   - Status:', userData.status);
    console.log('   - Department:', userData.department);
    console.log('   - Company:', userData.company);
    console.log('   - Requires new PIN:', userData.requires_new_pin);
    console.log('   - Must change password:', userData.must_change_password);
    console.log('');

    // 2. Verificar se tem auth_id configurado
    if (!userData.auth_id) {
      console.error('❌ PROBLEMA: Utilizador não tem auth_id configurado!');
      console.log('   O utilizador precisa de ter uma conta no Supabase Auth.');
      console.log('   Soluções:');
      console.log('   a) Criar conta no Auth e fazer link');
      console.log('   b) Fazer reset de password para criar conta');
      return;
    }

    console.log('✅ Auth ID configurado:', userData.auth_id);
    console.log('');

    // 3. Verificar role e permissões
    console.log('2️⃣ Analisando role e permissões...');
    const role = userData.role;
    console.log('   - Role na DB:', role);

    // Normalizar role
    const normalizedRole = role?.toLowerCase().trim();
    const isAdmin =
      normalizedRole === 'admin' ||
      normalizedRole === 'administrador' ||
      normalizedRole === 'administrator' ||
      normalizedRole === 'responsavel de departamento' ||
      normalizedRole === 'responsável de departamento';

    console.log('   - Role normalizada:', normalizedRole);
    console.log('   - É considerado Admin?', isAdmin ? '✅ SIM' : '❌ NÃO');
    console.log('');

    // 4. Verificar permissões na tabela de permissões
    console.log('3️⃣ Verificando permissões do role...');
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', role)
      .single();

    if (roleError || !roleData) {
      console.warn('⚠️  Role não encontrada na tabela roles:', role);
      console.log('   Isso pode causar problemas de permissões!');
    } else {
      console.log('✅ Role encontrada na tabela roles:');
      console.log('   - ID:', roleData.id);
      console.log('   - Nome:', roleData.name);
      console.log('   - Descrição:', roleData.description);
      console.log('');

      // Buscar permissões do role
      const { data: permissions, error: permError } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(name, description)')
        .eq('role_id', roleData.id);

      if (permError) {
        console.error('❌ Erro ao buscar permissões:', permError);
      } else {
        console.log('   Permissões associadas:');
        if (!permissions || permissions.length === 0) {
          console.log('   ⚠️  Nenhuma permissão encontrada!');
        } else {
          permissions.forEach(p => {
            const perm = p.permissions;
            console.log(`   - ${perm.name}: ${perm.description}`);
          });
        }
      }
    }
    console.log('');

    // 5. Teste de login (se tiver email)
    if (userData.email) {
      console.log('4️⃣ Para testar login, use:');
      console.log(`   Email: ${userData.email}`);
      console.log('   Password: [a password configurada pelo utilizador]');
      console.log('');
      console.log('   Se não souber a password, pode fazer reset com:');
      console.log(`   node scripts/reset-user-password.js ${userData.email} NovaPassword123!`);
    }

    // 6. Diagnóstico final
    console.log('\n=== DIAGNÓSTICO ===');
    const issues = [];

    if (!userData.auth_id) {
      issues.push('❌ Falta auth_id - utilizador não pode fazer login');
    }
    if (!userData.email) {
      issues.push('❌ Falta email - utilizador não pode fazer login');
    }
    if (userData.status !== 'ACTIVE') {
      issues.push('⚠️  Status não é ACTIVE - pode causar problemas');
    }
    if (!isAdmin) {
      issues.push('⚠️  Role não é reconhecida como Admin');
    }
    if (!roleData) {
      issues.push('⚠️  Role não existe na tabela roles');
    }

    if (issues.length > 0) {
      console.log('Problemas encontrados:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('✅ Tudo parece correto! Se ainda não consegue fazer login:');
      console.log('   1. Verifique se a password está correta');
      console.log('   2. Verifique os logs do browser (F12 > Console)');
      console.log('   3. Verifique se o ProtectedRoute está a bloquear o acesso');
    }

  } catch (error) {
    console.error('❌ Erro ao testar utilizador:', error);
  }
}

testUser73();
