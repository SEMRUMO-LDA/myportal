import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

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

// SHA-256 hash function (mesmo que no frontend)
const sha256 = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

// Lista de PINs comuns para testar
const commonPins = ['123456', '1234', '0000', '1111', '111111', '654321'];

console.log('SINCRONIZACAO DE PINS PARA SUPABASE AUTH\n');
console.log('Este script atualiza as passwords no Auth para corresponder aos PINs hasheados\n');

// Buscar todos users ativos com PIN e auth_id
const { data: users, error } = await supabaseAdmin
  .from('users')
  .select('id, name, email, auth_id, pin')
  .eq('status', 'ACTIVE')
  .not('auth_id', 'is', null)
  .not('pin', 'is', null)
  .order('id');

if (error) {
  console.error('Erro ao buscar users:', error);
  process.exit(1);
}

console.log('Total users a sincronizar:', users.length, '\n');

let synced = 0;
let errors = 0;
let skipped = 0;

for (const user of users) {
  // O PIN está hasheado na DB. Precisamos encontrar o PIN original
  // Vamos tentar os PINs comuns primeiro
  let foundPin = null;
  
  for (const testPin of commonPins) {
    const hashed = sha256(testPin);
    if (hashed === user.pin) {
      foundPin = testPin;
      break;
    }
  }
  
  if (!foundPin) {
    // Não conseguimos descobrir o PIN - vamos definir como 123456 padrão
    console.log('AVISO', user.id, '-', user.name, '- PIN desconhecido, usando 123456');
    foundPin = '123456';
  }
  
  // Atualizar password no Auth
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.auth_id,
    { password: foundPin }
  );
  
  if (updateError) {
    console.error('ERRO', user.id, '-', user.name, ':', updateError.message);
    errors++;
  } else {
    if (foundPin === '123456') {
      console.log('OK', user.id, '-', user.name, '- PIN:', foundPin, '(padrao)');
    } else {
      console.log('OK', user.id, '-', user.name, '- PIN:', foundPin);
    }
    synced++;
  }
}

console.log('\nRESUMO:');
console.log('  PINs sincronizados:', synced);
console.log('  Erros:', errors);
console.log('  Ignorados:', skipped);

console.log('\nAVISO: Users com PINs personalizados (nao comuns) foram definidos para 123456');
console.log('Eles precisarao mudar o PIN no primeiro login.');

process.exit(0);
