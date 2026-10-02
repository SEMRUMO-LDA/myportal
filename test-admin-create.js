import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });
// Try using supabaseAdmin to create the user and see if it fails
const supabaseAdmin = createClient(
  'https://pehkabxxhivuuyrvpmmw.supabase.co',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log("Using Key:", process.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10));
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'user73@myportal.internal',
    password: '000000',
    email_confirm: true
  });
  console.log("Create Data:", data.user?.id, "Error:", error?.message);
}
test();
