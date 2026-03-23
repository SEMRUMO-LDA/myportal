import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('RESETAR TODAS AS PASSWORDS PARA 123456\n');

const { data: users, error } = await supabaseAdmin
  .from('users')
  .select('id, name, email, auth_id')
  .eq('status', 'ACTIVE')
  .not('auth_id', 'is', null)
  .order('id');

if (error) {
  console.error('Erro:', error);
  process.exit(1);
}

console.log('Total users:', users.length, '\n');

let updated = 0;
let errors = 0;

for (const user of users) {
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.auth_id,
    { password: '123456' }
  );
  
  if (updateError) {
    console.error('ERRO', user.id, '-', user.name);
    errors++;
  } else {
    if (updated < 10 || updated % 20 === 0) {
      console.log('OK', user.id, '-', user.name);
    }
    updated++;
  }
  
  // Marcar para mudar PIN no primeiro login
  await supabaseAdmin
    .from('users')
    .update({ requires_new_pin: true })
    .eq('id', user.id);
}

console.log('\nRESUMO:');
console.log('  Passwords atualizadas:', updated);
console.log('  Erros:', errors);
console.log('\nTODOS os users agora tem password 123456');
console.log('e serao forcados a mudar no primeiro login.');

process.exit(0);
