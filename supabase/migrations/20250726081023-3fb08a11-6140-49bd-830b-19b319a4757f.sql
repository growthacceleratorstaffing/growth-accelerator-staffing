-- Fix database function security by adding proper search_path settings
-- This addresses the critical security warnings from the linter

-- 1. Fix update_updated_at_local_placements function
CREATE OR REPLACE FUNCTION public.update_updated_at_local_placements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Fix update_jobs_updated_at function
CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Fix update_crm_integrations_updated_at function
CREATE OR REPLACE FUNCTION public.update_crm_integrations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. Fix update_crm_contacts_updated_at function
CREATE OR REPLACE FUNCTION public.update_crm_contacts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. Fix update_crm_companies_updated_at function
CREATE OR REPLACE FUNCTION public.update_crm_companies_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create a secure user-specific LinkedIn tokens table
CREATE TABLE IF NOT EXISTS public.linkedin_user_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on the new table
ALTER TABLE public.linkedin_user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific LinkedIn tokens
CREATE POLICY "Users can view their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_linkedin_user_tokens_updated_at
BEFORE UPDATE ON public.linkedin_user_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_local_placements();

-- Create a secure table for encrypted API keys per user
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL, -- 'hubspot', 'salesforce', 'apollo', etc.
  encrypted_key TEXT NOT NULL,
  key_label TEXT, -- Optional label for the key
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- Enable RLS on the API keys table
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific API keys
CREATE POLICY "Users can view their own API keys" 
ON public.user_api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" 
ON public.user_api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
ON public.user_api_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" 
ON public.user_api_keys 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_api_keys_updated_at
BEFORE UPDATE ON public.user_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_local_placements();

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'login', 'api_key_created', 'api_key_deleted', 'failed_auth', etc.
  event_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs (admins only can view)
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert audit logs
CREATE POLICY "Service can insert audit logs" 
ON public.security_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;