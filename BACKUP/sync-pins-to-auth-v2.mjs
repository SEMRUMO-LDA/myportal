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

const sha256 = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

// Lista expandida de PINs comuns (4 e 6 dígitos)
const commonPins = [
  '123456', '654321', '111111', '000000',
  '1234', '4321', '1111', '0000', '9999',
  '1122', '2211', '5555', '6666', '7777', '8888'
];

console.log('SINCRONIZACAO DE PINS PARA SUPABASE AUTH v2\n');

const { data: users, error } = await supabaseAdmin
  .from('users')
  .select('id, name, email, auth_id, pin')
  .eq('status', 'ACTIVE')
  .not('auth_id', 'is', null)
  .not('pin', 'is', null)
  .order('id');

if (error) {
  console.error('Erro:', error);
  process.exit(1);
}

console.log('Total users:', users.length, '\n');

let synced = 0;
let errors = 0;

for (const user of users) {
  let foundPin = null;
  
  // Tentar descobrir o PIN original
  for (const testPin of commonPins) {
    const hashed = sha256(testPin);
    if (hashed === user.pin) {
      foundPin = testPin;
      break;
    }
  }
  
  // Se não encontrou ou PIN < 6 chars, usar 123456
  if (!foundPin || foundPin.length < 6) {
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
    console.log('OK', user.id, '-', user.name, '- PIN:', foundPin);
    synced++;
    
    // Se usamos PIN padrão, marcar para forçar mudança
    if (foundPin === '123456') {
      await supabaseAdmin
        .from('users')
        .update({ requires_new_pin: true })
        .eq('id', user.id);
    }
  }
}

console.log('\nRESUMO:');
console.log('  Sincronizados:', synced);
console.log('  Erros:', errors);
console.log('\nUsers com PIN desconhecido ou < 6 chars foram definidos para 123456');
console.log('e marcados como requires_new_pin = true');

process.exit(0);
