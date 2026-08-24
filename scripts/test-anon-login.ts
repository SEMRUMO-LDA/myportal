import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testQuery() {
  console.log('Using ANON key to fetch user 73...');
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, requires_new_pin')
    .eq('id', 73)
    .eq('status', 'ACTIVE')
    .single();

  console.log('Result:', { data, error });
}

testQuery().catch(console.error);
