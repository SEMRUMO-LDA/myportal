import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function fix() {
  const { data, error } = await supabase.from('users').update({ email: 'tiago@semrumo.eu' }).eq('id', 73);
  console.log("Fix error:", error);
}
fix();
