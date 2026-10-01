import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pehkabxxhivuuyrvpmmw.supabase.co';
const supabaseKey = 'sb_publishable_xSgX2vkvpslUKi0d92Gkzg_MloeTeAy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: user, error: fetchError } = await supabase.from('users').select('*').eq('id', 73).single();
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  
  console.log("Current user:", user);
  
  const payload = { ...user, address: null, department: null, phone: null };
  const { data, error } = await supabase.from('users').update(payload).eq('id', 73);
  
  if (error) {
    console.error("Update error:", error);
  } else {
    console.log("Update success!");
  }
}
test();
