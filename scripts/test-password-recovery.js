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

console.log('🧪 TESTE: Sistema de Recuperação de Password');
console.log('='.repeat(60));
console.log();

// Test with user ID 73 (Tiago)
const testUserId = 73;

async function testPasswordRecovery() {
  try {
    console.log(`1️⃣ Buscando utilizador com ID ${testUserId}...`);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, phone, email, auth_id')
      .eq('id', testUserId)
      .maybeSingle();

    if (userError) {
      console.error('❌ Erro ao buscar utilizador:', userError.message);
      return;
    }

    if (!userData) {
      console.error('❌ Utilizador não encontrado');
      return;
    }

    console.log('✅ Utilizador encontrado:');
    console.log('   Nome:', userData.name);
    console.log('   Email:', userData.email);
    console.log('   Telefone:', userData.phone || 'NÃO REGISTADO');
    console.log('   Auth ID:', userData.auth_id || 'NÃO MIGRADO');
    console.log();

    if (!userData.phone) {
      console.error('❌ ERRO: Utilizador não tem telefone registado!');
      return;
    }

    if (!userData.auth_id) {
      console.error('❌ ERRO: Utilizador não foi migrado para Supabase Auth!');
      return;
    }

    console.log('2️⃣ Gerando PIN aleatório de 6 dígitos...');
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('✅ PIN gerado:', newPin);
    console.log();

    console.log('3️⃣ Atualizando password no Supabase Auth...');
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userData.auth_id,
      { password: newPin }
    );

    if (authError) {
      console.error('❌ Erro ao atualizar Supabase Auth:', authError.message);
      return;
    }

    console.log('✅ Password atualizado no Supabase Auth');
    console.log();

    console.log('4️⃣ Definindo flag requires_new_pin...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ requires_new_pin: true })
      .eq('id', testUserId);

    if (updateError) {
      console.error('❌ Erro ao atualizar flag:', updateError.message);
      return;
    }

    console.log('✅ Flag atualizado');
    console.log();

    console.log('5️⃣ Verificando função RPC send_whatsapp_message...');

    // Check if function exists
    const { data: rpcData, error: rpcError } = await supabase.rpc('send_whatsapp_message', {
      p_phone: userData.phone,
      p_message: 'TESTE DE RECUPERAÇÃO',
      p_api_key: 'test_key_123'
    });

    if (rpcError) {
      console.error('❌ Erro ao chamar RPC:', rpcError.message);
      console.error('   Código:', rpcError.code);
      console.error('   Detalhes:', rpcError.details);
      console.log();
      console.log('⚠️  DIAGNÓSTICO:');
      if (rpcError.code === '42883') {
        console.log('   A função send_whatsapp_message NÃO EXISTE no banco de dados!');
        console.log('   É necessário criar esta função PostgreSQL.');
      } else if (rpcError.message.includes('timeout')) {
        console.log('   Timeout ao conectar ao serviço Wassenger');
      } else {
        console.log('   Erro desconhecido na comunicação');
      }
      return;
    }

    console.log('✅ RPC executado com sucesso');
    console.log('   Resposta:', JSON.stringify(rpcData, null, 2));
    console.log();

    console.log('✅ TESTE COMPLETO - Sistema funcional!');

  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message);
    console.error(error);
  }
}

testPasswordRecovery();
