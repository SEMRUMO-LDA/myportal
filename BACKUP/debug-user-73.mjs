import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('DEBUG User 73\n');

const { data: user } = await supabaseAdmin
  .from('users')
  .select('id, name, email, auth_id')
  .eq('id', 73)
  .single();

console.log('User DB:');
console.log('  ID:', user.id);
console.log('  Nome:', user.name);
console.log('  Email:', user.email);
console.log('  auth_id:', user.auth_id, '\n');

// Buscar dados do Auth
const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.auth_id);

if (authUser.user) {
  console.log('User Auth:');
  console.log('  UUID:', authUser.user.id);
  console.log('  Email:', authUser.user.email);
  console.log('  Email confirmado:', authUser.user.email_confirmed_at ? 'SIM' : 'NAO');
  console.log('  Criado:', authUser.user.created_at);
} else {
  console.log('ERRO: auth_id nao existe no Auth!');
}

process.exit(0);
