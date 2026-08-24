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
  
  // Test time log insert
  const { data: timeLog, error: timeError } = await supabase
    .from('time_logs')
    .insert({
      user_id: 73,
      entry_type: 'entrada',
      timestamp: new Date().toISOString()
    })
    .select();

  console.log('TimeLog Insert Result:', { data: timeLog, error: timeError });

  // Test mental state insert (assuming table is employee_feedback or mental_state)
  // Let's check employee_feedback table which is used for mental state usually.
  console.log('Testing employee_feedback insert...');
  const { data: feedback, error: feedbackError } = await supabase
    .from('employee_feedback')
    .insert({
      user_id: 73,
      rating: 5,
      feedback: 'Feeling good',
      category: 'mental_state'
    })
    .select();
    
  console.log('Feedback Insert Result:', { data: feedback, error: feedbackError });
}

testInsert().catch(console.error);
