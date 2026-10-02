import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const numericId = 73;
  const { data: dbUser, error: dbError } = await supabase.from('users').select('pin').eq('id', numericId).single();
  console.log("DB User:", dbUser, "Error:", dbError?.message);
}
test();
