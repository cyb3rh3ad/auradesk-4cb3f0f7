-- Fix: Allow team creators to view their teams immediately after creation
-- The current SELECT policy only allows team members to view, but when creating a team,
-- the creator hasn't been added as a member yet, causing .insert().select() to fail

DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;

CREATE POLICY "Users can view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  is_team_member(id, auth.uid()) OR created_by = auth.uid()
);