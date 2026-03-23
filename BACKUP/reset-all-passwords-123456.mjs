import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('RESETAR PASSWORDS PARA 123456\n');
console.log('Este script atualiza a password de TODOS os users ativos para 123456\n');

// Buscar todos users ativos com auth_id
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

console.log('Total users a atualizar:', users.length, '\n');

let updated = 0;
let errors = 0;

for (const user of users) {
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.auth_id,
    { password: '123456' }
  );
  
  if (updateError) {
    console.error('ERRO', user.id, '-', user.name, ':', updateError.message);
    errors++;
  } else {
    console.log('OK', user.id, '-', user.name);
    updated++;
  }
}

console.log('\nRESUMO:');
console.log('  Passwords atualizadas:', updated);
console.log('  Erros:', errors);

process.exit(0);
