-- Add policy to allow admin users from profiles table to see all jobs
CREATE POLICY "Admin users from profiles can see all jobs"
ON public.jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);