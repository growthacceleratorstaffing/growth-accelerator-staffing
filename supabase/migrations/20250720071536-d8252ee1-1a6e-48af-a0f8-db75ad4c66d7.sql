-- Temporarily allow admin email for setup
CREATE OR REPLACE FUNCTION validate_jazzhr_email(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Allow specific admin emails for initial setup
    IF email_to_check IN ('bartwetselaar.books@gmail.com', 'bart@growthaccelerator.nl') THEN
        RETURN true;
    END IF;
    
    -- Check if email exists in jazzhr_users table
    RETURN EXISTS (
        SELECT 1 FROM public.jazzhr_users 
        WHERE email = email_to_check
        AND is_active = true
    );
END;
$$;