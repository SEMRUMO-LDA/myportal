import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) throw new Error("Missing Service Key");

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data } = await supabaseAdmin.from('users').select('id, email, role, status').eq('id', 73).single();
  console.log("Public table:", data);

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = users.find(u => u.user_metadata?.employee_id === 73 || u.email === data?.email);
  console.log("Auth table by email or metadata:", authUser ? { id: authUser.id, email: authUser.email } : "Not found");
  
  // If email mismatch, let's fix it!
  if (data && authUser && data.email !== authUser.email) {
      console.log(`Fixing Auth Email to match public table: ${data.email}`);
      const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { email: data.email, email_confirm: true });
      if (error) {
          console.error("Error fixing email:", error);
      } else {
          console.log("Email fixed successfully in Supabase Auth!");
      }
  }
}
check();
