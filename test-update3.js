import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const { data, error } = await supabase.from('users').update({ email: "" }).eq('id', 73);
  console.log("Error empty string:", error);
  
  const { data: d2, error: e2 } = await supabase.from('users').update({ nif: null }).eq('id', 73);
  console.log("Error NIF null:", e2);
}
test();
