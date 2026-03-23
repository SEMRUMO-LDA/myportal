/**
 * Test PIN recovery flow
 * This simulates what happens when a user requests PIN reset
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

const TEST_USER_ID = 73; // Tiago

console.log('\n🧪 TESTE DE RECUPERAÇÃO DE PIN');
console.log('═'.repeat(60));
console.log(`User ID: ${TEST_USER_ID}\n`);

// Step 1: Get user data
console.log('📋 Passo 1: Buscar dados do utilizador');
const { data: user, error: userError } = await supabase
  .from('users')
  .select('id, name, email, phone, auth_id')
  .eq('id', TEST_USER_ID)
  .single();

if (userError || !user) {
  console.log('❌ Erro: Utilizador não encontrado');
  process.exit(1);
}

console.log(`   ✅ Utilizador: ${user.name}`);
console.log(`   📧 Email: ${user.email}`);
console.log(`   📱 Telemóvel: ${user.phone || 'NÃO REGISTADO'}`);
console.log(`   🔑 Auth ID: ${user.auth_id ? user.auth_id.substring(0, 8) + '...' : 'NULL'}`);

if (!user.phone) {
  console.log('\n❌ ERRO: Utilizador não tem telemóvel registado!');
  console.log('   Não é possível enviar PIN por WhatsApp.');
  process.exit(1);
}

if (!user.auth_id) {
  console.log('\n❌ ERRO: Utilizador não migrado para Supabase Auth!');
  process.exit(1);
}

// Step 2: Generate random PIN
const newPin = Math.floor(100000 + Math.random() * 900000).toString();
console.log(`\n📋 Passo 2: Gerar novo PIN aleatório`);
console.log(`   🔢 Novo PIN: ${newPin}`);

// Step 3: Update password in Supabase Auth
console.log(`\n📋 Passo 3: Atualizar password no Supabase Auth`);
const { error: authError } = await supabase.auth.admin.updateUserById(
  user.auth_id,
  { password: newPin }
);

if (authError) {
  console.log(`   ❌ Erro: ${authError.message}`);
  process.exit(1);
}
console.log('   ✅ Password atualizado com sucesso');

// Step 4: Set requires_new_pin flag
console.log(`\n📋 Passo 4: Marcar para obrigar mudança de PIN`);
const { error: flagError } = await supabase
  .from('users')
  .update({ requires_new_pin: true })
  .eq('id', TEST_USER_ID);

if (flagError) {
  console.log(`   ❌ Erro: ${flagError.message}`);
  process.exit(1);
}
console.log('   ✅ Flag requires_new_pin = true');

// Step 5: Format WhatsApp message
const message = `🔐 *SEMRUMO MyPortal - Recuperação de PIN*

Olá ${user.name}!

O seu PIN foi resetado com sucesso.

🆔 *ID Colaborador:* ${user.id}
🔑 *Novo PIN:* ${newPin}

⚠️ *IMPORTANTE:* Este PIN é temporário. Será obrigatório criar um novo PIN personalizado no próximo login.

🔒 Por motivos de segurança, não partilhe este PIN com ninguém.`;

console.log(`\n📋 Passo 5: Mensagem WhatsApp formatada`);
console.log('─'.repeat(60));
console.log(message);
console.log('─'.repeat(60));

console.log(`\n📱 Para testar o envio, a mensagem seria enviada para: ${user.phone}`);
console.log('\n⚠️  NOTA: Este script NÃO envia a mensagem WhatsApp.');
console.log('   A função wassengerService.sendMessage() seria chamada em produção.');

console.log('\n' + '═'.repeat(60));
console.log('✅ TESTE CONCLUÍDO COM SUCESSO');
console.log('\n💡 VERIFICAR:');
console.log(`   1. Fazer login com ID ${TEST_USER_ID} e PIN ${newPin}`);
console.log('   2. Sistema deve forçar criação de novo PIN personalizado');
console.log('');
