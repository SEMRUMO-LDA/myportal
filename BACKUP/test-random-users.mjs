import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('TESTE DE LOGIN - 5 USERS ALEATORIOS\n');

const testUserIds = [73, 294, 10024, 10010, 325]; // Mix de IDs

for (const userId of testUserIds) {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', userId)
    .single();
  
  if (!user) {
    console.log('ERRO: User', userId, 'nao encontrado\n');
    continue;
  }
  
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: '123456'
  });
  
  if (error) {
    console.log('FALHOU:', user.id, '-', user.name);
    console.log('  Erro:', error.message, '\n');
  } else {
    console.log('OK:', user.id, '-', user.name);
    await supabase.auth.signOut();
  }
}

console.log('\nTESTE COMPLETO!');
process.exit(0);
