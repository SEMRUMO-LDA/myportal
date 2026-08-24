import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixUser73() {
  console.log('Fixing User 73...');
  
  // 1. Create Auth User for Tiago
  console.log('Creating auth user for tiago@semrumo.eu with password 000000...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'tiago@semrumo.eu',
    password: '000000',
    email_confirm: true,
    user_metadata: { name: 'Tiago Pacheco' }
  });

  if (authError && !authError.message.includes('already registered')) {
    console.error('❌ Error creating auth user:', authError.message);
    return;
  }
  
  let authId;
  if (authData?.user) {
    authId = authData.user.id;
    console.log(`✅ Auth user created: ${authId}`);
  } else {
    console.log('⚠️ Auth user might already exist. Fetching it...');
    // Fetch the user ID if already created
    const { data: usersList } = await supabase.auth.admin.listUsers();
    const existing = usersList?.users.find(u => u.email === 'tiago@semrumo.eu');
    if (existing) {
      authId = existing.id;
      // Force update password to 000000
      await supabase.auth.admin.updateUserById(authId, { password: '000000' });
      console.log(`✅ Found existing auth user ${authId} and forced password to 000000`);
    } else {
      console.error('❌ Could not find auth user for tiago@semrumo.eu');
      return;
    }
  }

  // 2. Update the public.users table to link the auth_id
  console.log('Linking auth_id to public.users table...');
  const { error: dbError } = await supabase.from('users').update({ auth_id: authId, pin: '000000' }).eq('id', 73);

  if (dbError) {
    console.error('❌ Error updating public.users:', dbError.message);
  } else {
    console.log('✅ User 73 successfully linked and password set to 000000!');
  }
}

fixUser73().catch(console.error);
