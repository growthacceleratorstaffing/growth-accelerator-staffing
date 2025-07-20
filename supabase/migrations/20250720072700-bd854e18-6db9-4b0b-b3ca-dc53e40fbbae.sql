-- Update the user to admin role so they can see all jobs
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'bartwetselaar.books@gmail.com';