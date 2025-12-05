-- Drop all existing team policies and recreate them properly
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
DROP POLICY IF EXISTS "Team owners and admins can update teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON teams;

-- Create INSERT policy that allows any authenticated user to create a team
CREATE POLICY "Users can create teams" 
ON teams 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Recreate SELECT policy
CREATE POLICY "Users can view teams they are members of" 
ON teams 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = teams.id 
  AND team_members.user_id = auth.uid()
));

-- Recreate UPDATE policy
CREATE POLICY "Team owners and admins can update teams" 
ON teams 
FOR UPDATE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = teams.id 
  AND team_members.user_id = auth.uid() 
  AND team_members.role = ANY(ARRAY['owner', 'admin'])
));

-- Recreate DELETE policy
CREATE POLICY "Team owners can delete teams" 
ON teams 
FOR DELETE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM team_members 
  WHERE team_members.team_id = teams.id 
  AND team_members.user_id = auth.uid() 
  AND team_members.role = 'owner'
));