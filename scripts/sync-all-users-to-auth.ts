import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncUsers() {
  console.log('Fetching users from public.users...');
  
  const { data: users, error } = await supabase.from('users').select('*');
  
  if (error || !users) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log(`Found ${users.length} users. Checking Auth accounts...`);

  const { data: authUsersList, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
     console.error('Error fetching auth users:', authError);
     return;
  }
  
  const authUsers = authUsersList?.users || [];

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    // Generate the standard email used in this app
    const expectedEmail = user.email ? user.email.toLowerCase() : `${user.id}@semrumo.eu`;
    
    // Check if auth user exists
    const existingAuth = authUsers.find(u => u.email === expectedEmail);
    
    let authId = existingAuth?.id;

    if (!existingAuth) {
      console.log(`Creating Auth user for ${user.name} (${expectedEmail})...`);
      
      const pin = user.pin || '000000';
      const password = pin.length >= 6 ? pin : '000000'; // Fallback if pin is invalid length
      
      const { data: newAuthData, error: createError } = await supabase.auth.admin.createUser({
        email: expectedEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: user.name, id: user.id }
      });
      
      if (createError) {
         console.error(`❌ Failed to create Auth for user ${user.id}:`, createError.message);
         failCount++;
         continue;
      }
      authId = newAuthData.user.id;
      console.log(`✅ Created Auth for user ${user.id}`);
    } else {
       // Ensure password matches PIN if it's 000000 (just to be safe)
       const pin = user.pin || '000000';
       if (pin === '000000') {
           await supabase.auth.admin.updateUserById(authId!, { password: '000000' });
       }
    }

    // Link auth_id if it's missing in public.users
    if (user.auth_id !== authId) {
      console.log(`Linking auth_id ${authId} to user ${user.id}...`);
      await supabase.from('users').update({ auth_id: authId }).eq('id', user.id);
      successCount++;
    }
  }

  console.log(`\n🏁 Sync finished!`);
  console.log(`✅ Synced: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

syncUsers().catch(console.error);
