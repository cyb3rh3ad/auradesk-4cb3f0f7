-- Fix infinite recursion in team_members RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can update member roles" ON public.team_members;

-- Create a security definer function to check team membership and role
CREATE OR REPLACE FUNCTION public.check_team_role(
  _team_id uuid,
  _user_id uuid,
  _required_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
      AND role = ANY(_required_roles)
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Team owners and admins can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.check_team_role(team_id, auth.uid(), ARRAY['owner', 'admin'])
  OR auth.uid() = (SELECT created_by FROM teams WHERE id = team_id)
);

CREATE POLICY "Team owners and admins can remove members"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  public.check_team_role(team_id, auth.uid(), ARRAY['owner', 'admin'])
  OR auth.uid() = user_id
);

CREATE POLICY "Team owners and admins can update member roles"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  public.check_team_role(team_id, auth.uid(), ARRAY['owner', 'admin'])
);