-- Drop and recreate the teams INSERT policy with proper TO authenticated clause
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

CREATE POLICY "Users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);