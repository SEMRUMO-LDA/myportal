-- Create function to reset user PIN securely
-- This function updates both the Supabase Auth password and the user's requires_new_pin flag

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
  v_result JSON;
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
  -- This uses the auth schema which has elevated privileges
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_user_pin(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_pin(INTEGER, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION reset_user_pin IS 'Securely resets a user PIN by updating Supabase Auth password and setting requires_new_pin flag';
