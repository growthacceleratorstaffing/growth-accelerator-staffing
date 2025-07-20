-- Create security definer function to get user's assigned jobs from JazzHR
CREATE OR REPLACE FUNCTION public.get_user_assigned_jobs(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(assigned_jobs, '{}')
  FROM public.jazzhr_users
  WHERE user_id = _user_id
  AND is_active = true
$$;

-- Create function to check if user has access to specific job
CREATE OR REPLACE FUNCTION public.user_can_access_job(_user_id uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      -- Super admins and recruiting admins can see all jobs
      WHEN EXISTS (
        SELECT 1 FROM public.jazzhr_users 
        WHERE user_id = _user_id 
        AND jazzhr_role IN ('super_admin', 'recruiting_admin')
        AND is_active = true
      ) THEN TRUE
      -- Other users can only see their assigned jobs
      WHEN _job_id::text = ANY(
        SELECT unnest(assigned_jobs) 
        FROM public.jazzhr_users 
        WHERE user_id = _user_id 
        AND is_active = true
      ) THEN TRUE
      ELSE FALSE
    END
$$;