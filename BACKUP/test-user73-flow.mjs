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

// Funções copiadas do authUtils.ts
function normalizeRoleName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const ADMIN_ROLES_NORMALIZED = [
  'admin',
  'administrador',
  'responsavel de departamento',
  'diretor de unidade',
  'rh',
  'recursos humanos',
  'ceo',
  'diretor geral',
  'gerente'
];

function isAdminRole(normalizedRole) {
  return ADMIN_ROLES_NORMALIZED.includes(normalizedRole);
}

// Enum UserRole
const UserRole = {
  ADMIN: 'ADMIN',
  AUDITOR: 'AUDITOR',
  COLLABORATOR: 'COLLABORATOR'
};

async function testFullLoginFlow() {
  console.log('=== TESTE COMPLETO DO FLUXO DE LOGIN DO UTILIZADOR 73 ===\n');

  try {
    // 1. Buscar dados do utilizador
    console.log('1️⃣ Buscando dados do utilizador 73...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 73)
      .single();

    if (userError || !userData) {
      console.error('❌ Erro ao buscar utilizador:', userError);
      return;
    }

    console.log('✅ Utilizador encontrado:', userData.name);
    console.log('   Email:', userData.email);
    console.log('   Role:', `"${userData.role}"`);
    console.log('   Auth ID:', userData.auth_id);
    console.log('');

    // 2. Simular AuthContext - resolveUserSession
    console.log('2️⃣ Simulando AuthContext.resolveUserSession...');

    // Normalizar role
    const dbRoleRaw = userData.role || '';
    const normalizedDbRole = normalizeRoleName(dbRoleRaw);
    console.log('   Role normalizada:', `"${normalizedDbRole}"`);

    let role;
    if (isAdminRole(normalizedDbRole)) {
      role = UserRole.ADMIN;
      console.log('   ✅ Reconhecido como ADMIN pelo isAdminRole()');
    } else if (normalizedDbRole === 'auditor') {
      role = UserRole.AUDITOR;
      console.log('   Reconhecido como AUDITOR');
    } else {
      role = UserRole.COLLABORATOR;
      console.log('   Reconhecido como COLLABORATOR');
    }

    // Buscar permissões
    let permissions = [];
    if (role === UserRole.ADMIN) {
      permissions = ['*'];
      console.log('   Permissões: [\'*\'] (todas)');
    } else {
      // Buscar do job_roles
      const { data: jobRole } = await supabase
        .from('job_roles')
        .select('id')
        .eq('name', dbRoleRaw)
        .single();

      if (jobRole) {
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission_code')
          .eq('role_id', jobRole.id);

        permissions = rolePerms?.map(p => p.permission_code) || [];
        console.log(`   Permissões: [${permissions.join(', ')}]`);

        // Extra safety
        if (permissions.includes('VIEW_ADMIN')) {
          role = UserRole.ADMIN;
          permissions = ['*'];
          console.log('   ✅ Promovido para ADMIN devido a VIEW_ADMIN permission');
        }
      }
    }

    const userSession = {
      id: String(userData.id),
      name: userData.name,
      role: role,
      permissions: permissions,
      email: userData.email,
      token: 'fake-token-for-test'
    };

    console.log('   UserSession criada:', {
      id: userSession.id,
      name: userSession.name,
      role: userSession.role,
      permissions: userSession.permissions.length > 5 ? '[muitas...]' : userSession.permissions
    });
    console.log('');

    // 3. Simular Login.tsx - navegação
    console.log('3️⃣ Simulando Login.tsx - lógica de navegação...');
    const loginType = 'administrador'; // Assumindo que está no modo administrador
    console.log('   Login Type:', loginType);

    if (loginType === 'administrador') {
      const normalizedRole = normalizeRoleName(userSession.role || '');
      const hasAdminAccess = userSession.role === UserRole.ADMIN || isAdminRole(normalizedRole);

      console.log('   Normalized Role:', normalizedRole);
      console.log('   Has Admin Access?', hasAdminAccess ? '✅ SIM' : '❌ NÃO');

      if (hasAdminAccess) {
        console.log('   ✅ Navegaria para: /admin');
      } else if (userSession.role === UserRole.AUDITOR) {
        console.log('   Navegaria para: /auditor');
      } else {
        console.log('   ⚠️  Navegaria para: /portal (sem permissões admin)');
      }
    }
    console.log('');

    // 4. Simular ProtectedRoute
    console.log('4️⃣ Simulando ProtectedRoute para /admin...');
    const allowedRoles = [UserRole.ADMIN];
    console.log('   Allowed Roles:', allowedRoles);

    // Normalizar role do user
    let normalizedRole = UserRole.COLLABORATOR;
    const r = userSession.role;
    const normalizedName = normalizeRoleName(r || '');

    console.log('   User Role:', r);
    console.log('   User Role Normalized:', normalizedName);

    if (isAdminRole(normalizedName)) {
      normalizedRole = UserRole.ADMIN;
      console.log('   ✅ Normalizado para:', normalizedRole);
    } else if (normalizedName === 'auditor') {
      normalizedRole = UserRole.AUDITOR;
      console.log('   Normalizado para:', normalizedRole);
    } else {
      normalizedRole = UserRole.COLLABORATOR;
      console.log('   Normalizado para:', normalizedRole);
    }

    const hasAccess = allowedRoles.includes(normalizedRole);
    console.log('   Has Access?', hasAccess ? '✅ SIM' : '❌ NÃO');

    if (hasAccess) {
      console.log('   ✅ Acesso permitido ao /admin');
    } else {
      console.log('   ❌ Acesso negado - redirecionaria para /portal');
    }
    console.log('');

    // 5. Verificar sidebar
    console.log('5️⃣ Simulando Sidebar - visibilidade do menu Admin...');
    const hasPermission = (perm) => {
      if (userSession.role === UserRole.ADMIN || userSession.permissions.includes('*')) return true;
      return userSession.permissions.includes(perm);
    };

    const showAdminMenu = hasPermission('VIEW_ADMIN') ||
                         (userSession.role === UserRole.ADMIN) ||
                         isAdminRole(normalizeRoleName(userSession.role || ''));

    console.log('   hasPermission(VIEW_ADMIN):', hasPermission('VIEW_ADMIN') ? '✅' : '❌');
    console.log('   userSession.role === ADMIN:', userSession.role === UserRole.ADMIN ? '✅' : '❌');
    console.log('   isAdminRole(normalized):', isAdminRole(normalizeRoleName(userSession.role || '')) ? '✅' : '❌');
    console.log('   Mostrar menu Admin?', showAdminMenu ? '✅ SIM' : '❌ NÃO');
    console.log('');

    // 6. Resumo final
    console.log('=== RESUMO FINAL ===\n');

    const allChecks = [
      { name: 'Utilizador existe na DB', pass: true },
      { name: 'Tem auth_id configurado', pass: !!userData.auth_id },
      { name: 'Role reconhecido como Admin', pass: role === UserRole.ADMIN },
      { name: 'Tem permissão VIEW_ADMIN', pass: hasPermission('VIEW_ADMIN') },
      { name: 'Login.tsx redireciona para /admin', pass: hasAdminAccess },
      { name: 'ProtectedRoute permite acesso', pass: hasAccess },
      { name: 'Sidebar mostra menu Admin', pass: showAdminMenu }
    ];

    const failedChecks = allChecks.filter(c => !c.pass);

    if (failedChecks.length === 0) {
      console.log('🎉 TUDO CORRETO! O utilizador 73 DEVERIA conseguir aceder à zona admin.\n');
      console.log('Se ainda não consegue fazer login, o problema pode ser:');
      console.log('  1. ❌ Password incorreta');
      console.log('  2. ❌ Cache do browser (tentar em modo incógnito)');
      console.log('  3. ❌ Build desatualizado (fazer npm run build)');
      console.log('  4. ❌ Service Worker a servir versão antiga');
      console.log('  5. ❌ Algum erro no console do browser\n');
      console.log('Próximos passos:');
      console.log('  • Fazer build: npm run build');
      console.log('  • Limpar cache do browser');
      console.log('  • Testar em modo incógnito');
      console.log('  • Verificar console do browser (F12) para erros');
    } else {
      console.log('❌ PROBLEMAS ENCONTRADOS:\n');
      failedChecks.forEach(c => {
        console.log(`  ❌ ${c.name}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  }
}

testFullLoginFlow();
