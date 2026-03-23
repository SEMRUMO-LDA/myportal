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

console.log('SINCRONIZACAO DE CONTAS SUPABASE AUTH\n');
console.log('Este script cria contas no Supabase Auth para users que tem PIN mas nao tem conta.\n');

// Buscar todos users ativos
const { data: users, error } = await supabaseAdmin
  .from('users')
  .select('id, name, email, pin, auth_id, status')
  .eq('status', 'ACTIVE')
  .not('pin', 'is', null)
  .order('id');

if (error) {
  console.error('Erro ao buscar users:', error);
  process.exit(1);
}

console.log('Total users ativos com PIN:', users.length, '\n');

let created = 0;
let existing = 0;
let errors = 0;

for (const user of users) {
  const email = user.email || 'user' + user.id + '@myportal.internal';
  
  // Verificar se ja tem conta no Auth
  if (user.auth_id) {
    const { data: authCheck } = await supabaseAdmin.auth.admin.getUserById(user.auth_id);
    if (authCheck.user) {
      console.log('OK', user.id, '-', user.name, '- Ja tem conta Auth');
      existing++;
      continue;
    } else {
      console.log('PROBLEMA', user.id, '-', user.name, '- auth_id existe mas conta nao! Limpando...');
      // Limpar auth_id invalido
      await supabaseAdmin.from('users').update({ auth_id: null }).eq('id', user.id);
    }
  }
  
  // Criar conta no Auth
  console.log('CRIANDO conta para', user.id, '-', user.name);
  
  const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: '123456', // PIN padrao temporario
    email_confirm: true,
    user_metadata: {
      name: user.name,
      user_id: user.id
    }
  });
  
  if (createError) {
    console.error('  ERRO ao criar:', createError.message);
    errors++;
    continue;
  }
  
  // Atualizar auth_id na tabela users
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ auth_id: newAuthUser.user.id })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('  ERRO ao atualizar auth_id:', updateError.message);
    errors++;
  } else {
    console.log('  OK Conta criada! auth_id:', newAuthUser.user.id);
    created++;
  }
}

console.log('\nRESUMO:');
console.log('  Contas existentes:', existing);
console.log('  Contas criadas:', created);
console.log('  Erros:', errors);

process.exit(0);
