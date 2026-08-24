import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function updatePasswords() {
  console.log('Fetching users to update passwords...');
  
  // Get all users from our table
  const { data: users, error } = await supabase.from('users').select('id, auth_id, pin');
  
  if (error || !users) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log(`Found ${users.length} users. Updating passwords in Auth...`);

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    if (!user.auth_id) continue;
    
    // Set the Auth password to match their PIN (fallback to 000000)
    const newPassword = user.pin || '000000';
    
    // Only process if the PIN is valid (Supabase requires min 6 chars)
    if (newPassword.length < 6) {
      console.log(`⚠️ User ${user.id} has invalid PIN length. Skipping.`);
      continue;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.auth_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error(`❌ Failed to update password for user ${user.id}:`, updateError.message);
      failCount++;
    } else {
      successCount++;
      // Progress indicator without flooding the console
      if (successCount % 10 === 0) console.log(`✅ Updated ${successCount} users...`);
    }
  }

  console.log(`\n🏁 Finished updating passwords!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

updatePasswords().catch(console.error);
