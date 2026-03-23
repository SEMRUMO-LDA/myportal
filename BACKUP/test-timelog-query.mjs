#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://imfhacvrivasciftaujm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs'
);

console.log('🔍 Testing time_logs query...\n');

// Simular query do App.tsx
const now = new Date();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const dateFilter = sevenDaysAgo.toISOString().split('T')[0];

console.log(`📅 Date filter: >= ${dateFilter}`);
console.log(`📅 Today: ${now.toISOString().split('T')[0]}\n`);

const { data: timeLogs, error } = await supabase
  .from('time_logs')
  .select('id, user_id, date, check_in, check_out, status, manual_entry, location, notes')
  .gte('date', dateFilter)
  .order('date', { ascending: false })
  .order('check_in', { ascending: false })
  .limit(500);

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`✅ Query returned ${timeLogs.length} logs\n`);

// Group by date
const byDate = {};
timeLogs.forEach(log => {
  if (!byDate[log.date]) byDate[log.date] = [];
  byDate[log.date].push(log);
});

console.log('📊 Logs by date:');
Object.keys(byDate).sort().reverse().forEach(date => {
  console.log(`  ${date}: ${byDate[date].length} logs`);
  
  // Show today's logs in detail
  if (date === now.toISOString().split('T')[0]) {
    byDate[date].forEach(log => {
      const status = log.check_out ? '🔴 OUT' : '🟢 IN';
      console.log(`    ${status} User ${log.user_id}: ${log.check_in} → ${log.check_out || 'OPEN'}`);
    });
  }
});

// Check for open sessions (no check_out)
const openSessions = timeLogs.filter(log => !log.check_out);
console.log(`\n🟢 Open sessions (no check_out): ${openSessions.length}`);
if (openSessions.length > 0) {
  openSessions.forEach(log => {
    console.log(`  User ${log.user_id} - ${log.date} ${log.check_in}`);
  });
}

console.log('\n✅ Query test complete');
