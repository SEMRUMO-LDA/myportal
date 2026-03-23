#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://imfhacvrivasciftaujm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltZmhhY3ZyaXZhc2NpZnRhdWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNTc0MjUsImV4cCI6MjA4NDczMzQyNX0.Y47GlWAZP-bObKVXKXRWvc93ljkA9-_ccqaCtvej_Bs'
);

console.log('🔍 Checking time_logs table columns...\n');

// Try with * to get all columns
const { data, error } = await supabase
  .from('time_logs')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

if (data && data.length > 0) {
  const columns = Object.keys(data[0]);
  console.log('✅ Available columns in time_logs:');
  columns.forEach((col, i) => {
    console.log(`  ${i + 1}. ${col}`);
  });
  
  console.log('\n❌ Columns being requested but might not exist:');
  const requestedCols = ['manual_entry', 'location', 'notes'];
  requestedCols.forEach(col => {
    if (!columns.includes(col)) {
      console.log(`  ⚠️  ${col} - MISSING!`);
    } else {
      console.log(`  ✅ ${col} - exists`);
    }
  });
} else {
  console.log('⚠️  No data returned, table might be empty');
}
