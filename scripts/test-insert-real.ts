import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testInsert() {
  console.log('Logging in as tiago@semrumo.eu...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tiago@semrumo.eu',
    password: '000000'
  });

  if (authError || !authData.session) {
    console.error('Login failed:', authError?.message);
    return;
  }

  console.log('Login successful! Testing time_logs insert...');
  
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];

  const dbLog = {
    user_id: 73,
    date: todayStr,
    check_in: nowIso,
    status: 'PRESENT',
    check_in_location: 'Test Location',
    check_in_ip: '127.0.0.1',
    check_in_coordinates: { lat: 0, lng: 0 }
  };

  const { data: timeLog, error: timeError } = await supabase
    .from('time_logs')
    .insert(dbLog)
    .select()
    .single();

  console.log('TimeLog Insert Result:', { data: timeLog, error: timeError });
}

testInsert().catch(console.error);
