import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pehkabxxhivuuyrvpmmw.supabase.co', 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy');

async function test() {
  const { data, error } = await supabase.rpc('get_table_schema', { p_table: 'users' });
  if (error) console.log("RPC Error:", error.message);
  else console.log(data);
}
test();
