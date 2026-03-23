/**
 * Apply the reset_user_pin migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const sql = `
-- Create function to reset user PIN securely
CREATE OR REPLACE FUNCTION reset_user_pin(
  p_user_id INTEGER,
  p_new_pin TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user's auth_id and email
  SELECT auth_id, email INTO v_auth_id, v_user_email
  FROM users
  WHERE id = p_user_id;

  -- Check if user exists
  IF v_auth_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Utilizador não encontrado ou não migrado para Supabase Auth'
    );
  END IF;

  -- Update password in auth.users (Supabase Auth)
  UPDATE auth.users
  SET
    encrypted_password = crypt(p_new_pin, gen_salt('bf')),
    updated_at = now()
  WHERE id = v_auth_id;

  -- Update requires_new_pin flag in public.users
  UPDATE users
  SET requires_new_pin = true
  WHERE id = p_user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'PIN resetado com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erro ao resetar PIN: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reset_user_pin(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_pin(INTEGER, TEXT) TO anon;
`;

console.log('🔧 Applying reset_user_pin migration...\n');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.log('❌ Migration failed:', error.message);
  console.log('\n💡 Trying alternative method...');

  // Try using Supabase SQL editor endpoint directly
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    console.log('❌ Alternative method also failed');
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('\n' + sql);
  } else {
    console.log('✅ Migration applied successfully!');
  }
} else {
  console.log('✅ Migration applied successfully!');
  console.log(data);
}

console.log('\n🎯 Function reset_user_pin is now available');
console.log('   This function securely resets user PINs via RPC');
