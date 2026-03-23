import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imfhacvrivasciftaujm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Fechando sessao aberta...\n');

const userId = 69;
const today = '2026-03-19';

const { data: openLog } = await supabase
  .from('time_logs')
  .select('*')
  .eq('user_id', userId)
  .eq('date', today)
  .is('check_out', null)
  .maybeSingle();

if (openLog) {
  console.log('Sessao encontrada:');
  console.log('  ID:', openLog.id);
  console.log('  Check-in:', openLog.check_in);
  
  const { error } = await supabase
    .from('time_logs')
    .update({
      check_out: '18:00',
      check_out_location: 'Fechado automaticamente',
      status: 'COMPLETE'
    })
    .eq('id', openLog.id);
  
  if (error) {
    console.log('ERRO:', error.message);
  } else {
    console.log('\nOK - Sessao fechada as 18:00');
  }
} else {
  console.log('Nenhuma sessao aberta encontrada');
}

process.exit(0);
