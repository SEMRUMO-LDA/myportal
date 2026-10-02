import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const email = `user73@myportal.internal`;
  
  // What AuthService does:
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: "0" // Wrong password
  });

  console.log("signIn error:", authError?.message);
}
test();
