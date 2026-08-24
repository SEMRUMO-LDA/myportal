import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getPolicies() {
  const { data, error } = await supabase.rpc('run_sql', { query: "SELECT * FROM pg_policies WHERE tablename = 'time_logs';" });
  if (error) {
    console.error('RPC failed. Trying direct query (might fail if not permitted):');
    // Fallback if no RPC exists
  } else {
    console.log(data);
  }
}
getPolicies().catch(console.error);
