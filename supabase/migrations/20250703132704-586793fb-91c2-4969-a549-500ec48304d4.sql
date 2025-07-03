-- Create JobAdder scopes enum
CREATE TYPE public.jobadder_scope AS ENUM (
  'read',
  'write',
  'read_candidate',
  'write_candidate',
  'read_company',
  'write_company',
  'read_contact',
  'write_contact',
  'read_jobad',
  'write_jobad',
  'read_jobapplication',
  'write_jobapplication',
  'read_job',
  'write_job',
  'read_placement',
  'write_placement',
  'read_user',
  'partner_jobboard',
  'offline_access'
);

-- Add JobAdder scopes column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN jobadder_scopes jobadder_scope[] DEFAULT ARRAY['read', 'read_candidate', 'read_job', 'read_jobad']::jobadder_scope[];

-- Add JobAdder user permissions table
CREATE TABLE public.jobadder_user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope jobadder_scope NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, scope)
);

-- Enable RLS on jobadder_user_permissions
ALTER TABLE public.jobadder_user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for jobadder_user_permissions
CREATE POLICY "Users can view their own permissions" 
ON public.jobadder_user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions" 
ON public.jobadder_user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create function to check JobAdder scope permissions
CREATE OR REPLACE FUNCTION public.has_jobadder_scope(_user_id uuid, _scope jobadder_scope)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobadder_user_permissions
    WHERE user_id = _user_id
      AND scope = _scope
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND _scope = ANY(jobadder_scopes)
  )
$$;

-- Update admin users with full permissions
UPDATE public.profiles 
SET jobadder_scopes = ARRAY[
  'read', 'write', 'read_candidate', 'write_candidate', 
  'read_company', 'write_company', 'read_contact', 'write_contact',
  'read_jobad', 'write_jobad', 'read_jobapplication', 'write_jobapplication',
  'read_job', 'write_job', 'read_placement', 'write_placement',
  'read_user', 'partner_jobboard', 'offline_access'
]::jobadder_scope[]
WHERE role = 'admin';