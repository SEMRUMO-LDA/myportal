import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('Verificando users sem auth_id...\n');

const { data: users, error } = await supabase
  .from('users')
  .select('id, name, email, auth_id')
  .is('auth_id', null)
  .limit(10);

if (error) {
  console.error('Erro:', error);
  process.exit(1);
}

const total = users ? users.length : 0;
console.log('Encontrados', total, 'users SEM auth_id\n');

if (users && users.length > 0) {
  console.log('Primeiros 10:');
  users.forEach(u => {
    console.log('  - ID:', u.id, ', Nome:', u.name, ', Email:', u.email || 'N/A');
  });
}

// Contar total
const { count } = await supabase
  .from('users')
  .select('id', { count: 'exact', head: true })
  .is('auth_id', null);

console.log('\nTOTAL:', count, 'users sem auth_id');

process.exit(0);
