import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Verificar se algum user tem email NULL ou vazio
const { data: usersNoEmail } = await supabase
  .from('users')
  .select('id, name, email, status')
  .eq('status', 'ACTIVE')
  .or('email.is.null,email.eq.');

console.log('Users ATIVOS sem email:', usersNoEmail?.length || 0);

if (usersNoEmail && usersNoEmail.length > 0) {
  console.log('\nPrimeiros 10:');
  usersNoEmail.slice(0, 10).forEach(u => {
    console.log('  ID:', u.id, '- Nome:', u.name, '- Email:', u.email || 'NULL');
  });
}

process.exit(0);
