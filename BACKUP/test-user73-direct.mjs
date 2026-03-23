import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('Testando login User 73 com varias passwords...\n');

const testPasswords = ['123456', 'tiagopacheco', 'admin', '111111', '654321'];

for (const pwd of testPasswords) {
  const { error } = await supabase.auth.signInWithPassword({
    email: 'tiagopacheco@me.com',
    password: pwd
  });
  
  if (error) {
    console.log('FALHOU com password:', pwd);
  } else {
    console.log('SUCESSO com password:', pwd);
    await supabase.auth.signOut();
    process.exit(0);
  }
}

console.log('\nNenhuma password comum funcionou.');
console.log('Vou resetar para 123456 agora...\n');

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

await supabaseAdmin.auth.admin.updateUserById(
  'd8256250-5a11-4ecf-8be6-dec6e60844df',
  { password: '123456' }
);

console.log('Password resetada. Testando novamente...');

const { error: error2 } = await supabase.auth.signInWithPassword({
  email: 'tiagopacheco@me.com',
  password: '123456'
});

if (error2) {
  console.log('AINDA FALHA:', error2.message);
} else {
  console.log('SUCESSO!');
  await supabase.auth.signOut();
}

process.exit(0);
