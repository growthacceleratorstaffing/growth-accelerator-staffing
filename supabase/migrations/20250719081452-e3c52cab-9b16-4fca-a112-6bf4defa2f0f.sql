-- Create JazzHR role enum based on JazzHR's official roles
CREATE TYPE jazzhr_role AS ENUM (
  'super_admin',
  'recruiting_admin', 
  'super_user',
  'recruiting_user',
  'interviewer',
  'developer',
  'external_recruiter'
);

-- Create JazzHR users table to store user data from JazzHR API
CREATE TABLE IF NOT EXISTS jazzhr_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  jazzhr_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  jazzhr_role jazzhr_role NOT NULL DEFAULT 'recruiting_user',
  permissions JSONB DEFAULT '{}',
  assigned_jobs TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on jazzhr_users
ALTER TABLE jazzhr_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for jazzhr_users
CREATE POLICY "Users can view their own JazzHR data"
  ON jazzhr_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all JazzHR users"
  ON jazzhr_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jazzhr_users ju
      WHERE ju.user_id = auth.uid() 
      AND ju.jazzhr_role = 'super_admin'
    )
  );

CREATE POLICY "Service role can manage jazzhr_users"
  ON jazzhr_users FOR ALL
  USING (true);

-- Create function to check JazzHR role
CREATE OR REPLACE FUNCTION has_jazzhr_role(_user_id UUID, _role jazzhr_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jazzhr_users
    WHERE user_id = _user_id
      AND jazzhr_role = _role
      AND is_active = true
  )
$$;

-- Create function to validate JazzHR email during signup
CREATE OR REPLACE FUNCTION validate_jazzhr_email(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check if email exists in jazzhr_users table
    RETURN EXISTS (
        SELECT 1 FROM public.jazzhr_users 
        WHERE email = email_to_check
        AND is_active = true
    );
END;
$$;

-- Update the handle_new_user function to work with JazzHR users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    jazzhr_user_record RECORD;
BEGIN
    -- Check if profile already exists to avoid conflicts
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Insert into profiles table with basic error handling
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                'user' -- Default to user role, will be updated by JazzHR sync
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the auth process
            RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    -- Check if user exists in jazzhr_users table
    SELECT * INTO jazzhr_user_record
    FROM public.jazzhr_users 
    WHERE email = NEW.email;
    
    IF jazzhr_user_record IS NOT NULL THEN
        -- Update jazzhr_users with user_id
        BEGIN
            UPDATE public.jazzhr_users
            SET user_id = NEW.id,
                updated_at = now()
            WHERE email = NEW.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to update jazzhr_users for user %: %', NEW.email, SQLERRM;
        END;
        
        -- Create user_roles based on jazzhr_role
        BEGIN
            CASE jazzhr_user_record.jazzhr_role
                WHEN 'super_admin' THEN
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'admin')
                    ON CONFLICT (user_id, role) DO NOTHING;
                    
                    -- Update profile role for super admins
                    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
                    
                WHEN 'recruiting_admin' THEN
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'moderator')
                    ON CONFLICT (user_id, role) DO NOTHING;
                    
                    -- Update profile role for recruiting admins
                    UPDATE public.profiles SET role = 'moderator' WHERE id = NEW.id;
                    
                ELSE
                    -- Default to user role for other JazzHR roles
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'user')
                    ON CONFLICT (user_id, role) DO NOTHING;
            END CASE;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to assign user role for user %: %', NEW.email, SQLERRM;
        END;
    ELSE
        -- User not found in JazzHR, create minimal record (or reject signup)
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'user')
            ON CONFLICT (user_id, role) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to assign default user role for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to update updated_at on jazzhr_users
CREATE OR REPLACE FUNCTION update_jazzhr_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_jazzhr_users_updated_at
  BEFORE UPDATE ON jazzhr_users
  FOR EACH ROW
  EXECUTE FUNCTION update_jazzhr_users_updated_at();