-- Make the current user an admin by updating their profile role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = (
  SELECT email FROM auth.users 
  WHERE id = auth.uid()
) 
AND role != 'admin';

-- If no profile exists, this will ensure the make_first_user_admin function works
SELECT public.make_first_user_admin();