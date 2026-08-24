import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const NEW_URL = process.env.VITE_SUPABASE_URL!;
const NEW_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!NEW_URL || !NEW_KEY) {
  console.error('❌ Supabase URL or Service Key missing in .env');
  process.exit(1);
}

const supabase = createClient(NEW_URL, NEW_KEY);

async function importUsers() {
  console.log('🚀 Starting user import from CSV...');
  
  const csvPath = path.resolve(process.cwd(), 'BACKUP', 'LINKS_PICAGEM_TODOS.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at ${csvPath}`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  // Parse CSV
  // Format: ID,Nome,Telefone,URL
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`✅ Found ${records.length} users in CSV.`);

  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    const id = parseInt(record.ID);
    const name = record.Nome;
    const phone = record.Telefone;

    if (isNaN(id)) {
      console.log(`  ⚠️ Skipping invalid record (no ID): ${name}`);
      continue;
    }

    console.log(`\nImporting user [${id}] ${name}...`);
    
    // Generate fallback email
    const email = `user${id}@semrumo.eu`;
    const defaultPassword = `SemRumo2026!`;

    try {
      // 1. Check if user already exists in DB
      const { data: existingUser } = await supabase.from('users').select('id').eq('id', id).single();
      if (existingUser) {
        console.log(`  ⚠️ User ${id} already exists in DB. Skipping.`);
        successCount++;
        continue;
      }

      // 2. Create Auth User
      console.log(`  -> Creating auth user (${email})...`);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { name: name }
      });

      if (authError) {
        console.error(`  ❌ Error creating auth user: ${authError.message}`);
        failCount++;
        continue;
      }

      const authId = authData.user.id;
      console.log(`  ✅ Auth user created: ${authId}`);

      // 3. Insert into public.users
      const { error: dbError } = await supabase.from('users').insert({
        id: id,
        auth_id: authId,
        name: name,
        email: email,
        phone: phone,
        status: 'ACTIVE',
        role: 'Colaborador', // Default role
        company: 'SEMRUMO',
        pin: '000000', // Default PIN for Kiosk
        requires_new_pin: true,
        must_change_password: true,
        work_start_time: '09:00',
        work_end_time: '18:00',
        lunch_start_time: '13:00',
        lunch_end_time: '14:00',
        vacation_days_yearly: 22,
        vacation_days_carryover: 0,
        vacation_adjustments: 0,
      });

      if (dbError) {
        console.error(`  ❌ Error inserting to public.users: ${dbError.message}`);
        failCount++;
      } else {
        console.log(`  ✅ Successfully imported ${name}`);
        successCount++;
      }

    } catch (e: any) {
      console.error(`  ❌ Unexpected error: ${e.message}`);
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log(`🏁 Import Completed!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (successCount > 0) {
    console.log(`\nFixing ID sequence...`);
    await supabase.rpc('set_users_id_seq'); // Supabase doesn't allow raw SQL queries easily from the client, so we just log a message to do it manually.
    console.log(`⚠️ IMPORTANT: Run this in the Supabase SQL Editor to update the ID sequence:`);
    console.log(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`);
  }
}

importUsers().catch(console.error);
