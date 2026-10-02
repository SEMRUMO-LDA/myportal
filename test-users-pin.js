import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const { data, error } = await supabase.from('users').select('id, pin, requires_new_pin').eq('id', 73).single();
  console.log(data);
}
test();
