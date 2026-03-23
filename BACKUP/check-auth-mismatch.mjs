import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('Verificando users com auth_id mas sem conta Auth...\n');

// Buscar users com auth_id preenchido
const { data: usersWithAuthId, error } = await supabase
  .from('users')
  .select('id, name, email, auth_id')
  .not('auth_id', 'is', null)
  .limit(100);

if (error) {
  console.error('Erro:', error);
  process.exit(1);
}

console.log('Total users com auth_id:', usersWithAuthId.length);

// Verificar cada um no auth.users
let mismatches = 0;
for (const user of usersWithAuthId.slice(0, 10)) {
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.auth_id);
  
  if (authError || !authUser.user) {
    console.log('PROBLEMA:', user.id, '-', user.name, '- auth_id existe mas conta Auth nao!');
    mismatches++;
  }
}

console.log('\nTotal problemas encontrados:', mismatches, 'de', Math.min(10, usersWithAuthId.length), 'verificados');

process.exit(0);
