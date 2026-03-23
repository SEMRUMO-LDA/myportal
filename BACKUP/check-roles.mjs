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

async function checkRoles() {
  console.log('=== ROLES DISPONÍVEIS NA BASE DE DADOS ===\n');

  // 1. Buscar todos os roles
  const { data: roles, error } = await supabase
    .from('job_roles')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Erro ao buscar roles:', error);
    return;
  }

  if (!roles || roles.length === 0) {
    console.log('⚠️  Nenhum role encontrado na tabela roles!');
    return;
  }

  console.log(`Encontrados ${roles.length} roles:\n`);

  for (const role of roles) {
    console.log(`📋 ${role.name}`);
    console.log(`   ID: ${role.id}`);
    console.log(`   Descrição: ${role.description || 'N/A'}`);

    // Buscar permissões
    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('permission_code')
      .eq('role_id', role.id);

    if (permissions && permissions.length > 0) {
      console.log(`   Permissões (${permissions.length}):`);
      permissions.forEach(p => {
        console.log(`     - ${p.permission_code}`);
      });
    } else {
      console.log('   ⚠️  Sem permissões configuradas');
    }
    console.log('');
  }

  // 2. Buscar users com roles que não existem
  console.log('\n=== UTILIZADORES COM ROLES INEXISTENTES ===\n');

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, role')
    .order('id');

  const roleNames = roles.map(r => r.name);
  const usersWithInvalidRoles = users?.filter(u => u.role && !roleNames.includes(u.role));

  if (usersWithInvalidRoles && usersWithInvalidRoles.length > 0) {
    console.log(`⚠️  Encontrados ${usersWithInvalidRoles.length} utilizadores com roles não registados:\n`);
    usersWithInvalidRoles.forEach(u => {
      console.log(`   - ID ${u.id}: ${u.name} (${u.email})`);
      console.log(`     Role: "${u.role}"`);
    });
  } else {
    console.log('✅ Todos os utilizadores têm roles válidos');
  }
}

checkRoles();
