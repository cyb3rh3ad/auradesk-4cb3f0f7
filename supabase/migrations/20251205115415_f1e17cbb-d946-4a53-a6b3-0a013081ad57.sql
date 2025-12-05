-- Drop ALL existing policies on teams table
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Team owners and admins can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;

-- Ensure RLS is enabled
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- INSERT: Any authenticated user can create teams (no restrictions on created_by)
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Users can view teams they are members of
CREATE POLICY "Users can view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.is_team_member(id, auth.uid()));

-- UPDATE: Only owners and admins can update
CREATE POLICY "Owners and admins can update teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (public.check_team_role(id, auth.uid(), ARRAY['owner', 'admin']));

-- DELETE: Only owners can delete
CREATE POLICY "Owners can delete teams"
ON public.teams
FOR DELETE
TO authenticated
USING (public.check_team_role(id, auth.uid(), ARRAY['owner']));