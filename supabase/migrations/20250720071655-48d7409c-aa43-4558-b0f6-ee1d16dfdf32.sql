-- Update validation function to check actual JazzHR users (remove temporary admin override)
CREATE OR REPLACE FUNCTION validate_jazzhr_email(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check if email exists in jazzhr_users table and user is active
    RETURN EXISTS (
        SELECT 1 FROM public.jazzhr_users 
        WHERE email = email_to_check
        AND is_active = true
    );
END;
$$;