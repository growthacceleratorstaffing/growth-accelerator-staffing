-- Check the current RLS policies on jobs table to see if there are conflicts
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'jobs';