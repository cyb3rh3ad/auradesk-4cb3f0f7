-- Fix 1: Drop overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Fix 2: Fix team_members INSERT policy race condition
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;

CREATE POLICY "Team owners and admins can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Creator adding themselves as first member
  (auth.uid() = user_id AND auth.uid() = (SELECT created_by FROM public.teams WHERE id = team_id))
  -- OR existing owner/admin adding others
  OR public.check_team_role(team_id, auth.uid(), ARRAY['owner', 'admin'])
);