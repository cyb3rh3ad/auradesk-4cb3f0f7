-- Drop the existing INSERT policy and recreate it with proper permissions
DROP POLICY IF EXISTS "Users can create teams" ON teams;

-- Create a more permissive policy that properly allows authenticated users to create teams
CREATE POLICY "Users can create teams" 
ON teams 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);