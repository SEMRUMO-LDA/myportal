import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

console.log('Atualizando User 73 - Tiago para PIN 000000\n');

// Atualizar password no Auth
await supabaseAdmin.auth.admin.updateUserById(
  'd8256250-5a11-4ecf-8be6-dec6e60844df',
  { password: '000000' }
);

// Atualizar PIN hasheado na tabela users
const hashedPin = sha256('000000');
await supabaseAdmin
  .from('users')
  .update({ 
    pin: hashedPin,
    requires_new_pin: false 
  })
  .eq('id', 73);

console.log('OK Password Auth: 000000');
console.log('OK PIN hasheado atualizado');
console.log('OK requires_new_pin: false\n');

// Testar login
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { error } = await supabase.auth.signInWithPassword({
  email: 'tiagopacheco@me.com',
  password: '000000'
});

if (error) {
  console.error('ERRO no teste:', error.message);
} else {
  console.log('SUCESSO! Login funciona com PIN 000000');
  await supabase.auth.signOut();
}

process.exit(0);
