-- First, reset all users to viewer role
UPDATE public.profiles 
SET role = 'viewer' 
WHERE role = 'admin';

-- Then make only the specified emails admins
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('bart@startupaccelerator.nl', 'bart@growthaccelerator.nl');