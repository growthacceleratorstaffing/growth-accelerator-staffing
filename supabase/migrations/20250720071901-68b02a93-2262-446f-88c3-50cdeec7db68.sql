-- Drop existing job access policies
DROP POLICY IF EXISTS "Workable users can view assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Workable hiring managers can update jobs" ON jobs;
DROP POLICY IF EXISTS "Workable hiring managers can create jobs" ON jobs;
DROP POLICY IF EXISTS "Workable admins can manage all jobs" ON jobs;

-- Create new JazzHR-based job access policies
CREATE POLICY "JazzHR users can view assigned jobs" 
ON jobs FOR SELECT
USING (user_can_access_job(auth.uid(), id));

CREATE POLICY "JazzHR admins can manage all jobs" 
ON jobs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.jazzhr_users 
    WHERE user_id = auth.uid() 
    AND jazzhr_role IN ('super_admin', 'recruiting_admin')
    AND is_active = true
  )
);

CREATE POLICY "JazzHR users can update assigned jobs" 
ON jobs FOR UPDATE
USING (user_can_access_job(auth.uid(), id));

CREATE POLICY "JazzHR hiring managers can create jobs" 
ON jobs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jazzhr_users 
    WHERE user_id = auth.uid() 
    AND jazzhr_role IN ('super_admin', 'recruiting_admin', 'recruiting_user')
    AND is_active = true
  )
);