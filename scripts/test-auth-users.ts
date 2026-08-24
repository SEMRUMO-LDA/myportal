import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAuthUsers() {
  console.log(`Checking auth users for project: ${process.env.VITE_SUPABASE_URL}`);
  
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching auth users:', error);
  } else {
    console.log(`Found ${data.users.length} auth users.`);
    if (data.users.length > 0) {
      console.log('Sample user:', data.users[0].email);
    }
  }
}

checkAuthUsers().catch(console.error);
