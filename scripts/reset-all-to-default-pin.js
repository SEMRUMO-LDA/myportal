/**
 * Reset ALL users to default PIN 123456
 * This ensures everyone can login
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DEFAULT_PIN = '123456';

async function resetAllUsers() {
  console.log('\n🔐 RESET DE TODOS OS UTILIZADORES PARA PIN PADRÃO');
  console.log('═'.repeat(60));
  console.log(`PIN padrão: ${DEFAULT_PIN}`);
  console.log('');

  // Get all users with auth_id
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, auth_id')
    .not('auth_id', 'is', null)
    .order('id');

  if (usersError) {
    console.log('❌ Erro ao buscar utilizadores:', usersError.message);
    return;
  }

  console.log(`📊 Total de utilizadores migrados: ${users.length}`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      // Update password in Supabase Auth
      const { error } = await supabase.auth.admin.updateUserById(
        user.auth_id,
        { password: DEFAULT_PIN }
      );

      if (error) {
        console.log(`❌ User ${user.id} (${user.name}): ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ User ${user.id} (${user.name})`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ User ${user.id} (${user.name}): ${err.message}`);
      errorCount++;
    }
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RESUMO:');
  console.log(`   ✅ Sucesso: ${successCount} utilizadores`);
  console.log(`   ❌ Erros: ${errorCount} utilizadores`);
  console.log('');

  // Also remove requires_new_pin flag for all users
  console.log('🔧 Removendo flag requires_new_pin de todos os utilizadores...');
  const { error: updateError } = await supabase
    .from('users')
    .update({ requires_new_pin: false })
    .not('auth_id', 'is', null);

  if (updateError) {
    console.log('❌ Erro ao atualizar flags:', updateError.message);
  } else {
    console.log('✅ Flags atualizados com sucesso');
  }

  console.log('');
  console.log('🎯 CONCLUSÃO:');
  console.log(`   Todos os utilizadores podem agora fazer login com PIN: ${DEFAULT_PIN}`);
  console.log('');
}

resetAllUsers().catch(console.error);
