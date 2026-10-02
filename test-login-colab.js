import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const { data, error } = await supabase.from('users').select('id').limit(5);
  for (const user of data) {
    const email = `user${user.id}@myportal.internal`;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: "some-password"
    });
    console.log(`User ${user.id} signIn error:`, authError?.message);
  }
}
test();
