import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const email = "user73@myportal.internal";
  const password = "000000"; // Assuming 000000 is still the PIN
  
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  console.log("signIn error:", authError?.message);

  if (authError && authError.message.includes('Invalid login credentials')) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password
    });
    console.log("signUp error:", signUpError?.message);
    if (!signUpError && signUpData.user) {
      console.log("signUp success!", signUpData.user.id);
    }
  }
}
test();
