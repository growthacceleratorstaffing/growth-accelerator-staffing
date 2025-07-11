-- Fix the infinite recursion issue with jobadder_users RLS policies
-- Drop the problematic policies that query the same table
DROP POLICY IF EXISTS "Admins can manage all JobAdder data" ON public.jobadder_users;
DROP POLICY IF EXISTS "Admins can view all JobAdder data" ON public.jobadder_users;

-- Create non-recursive policies
-- Allow service role to manage all data (for server-side operations)
CREATE POLICY "Service role can manage all JobAdder data" 
ON public.jobadder_users 
FOR ALL 
TO service_role
USING (true);

-- Allow users to view and manage their own JobAdder data
CREATE POLICY "Users can manage their own JobAdder data" 
ON public.jobadder_users 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow admins (based on profiles table) to view all data
CREATE POLICY "Admins can view all JobAdder data based on profiles" 
ON public.jobadder_users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to manage all data
CREATE POLICY "Admins can manage all JobAdder data based on profiles" 
ON public.jobadder_users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);