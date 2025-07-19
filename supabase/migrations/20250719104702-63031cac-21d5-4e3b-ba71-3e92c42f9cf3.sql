-- Fix the infinite recursion in jazzhr_users policies
DROP POLICY IF EXISTS "Super admins can manage all JazzHR users" ON jazzhr_users;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Super admins can manage all JazzHR users" 
ON jazzhr_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);