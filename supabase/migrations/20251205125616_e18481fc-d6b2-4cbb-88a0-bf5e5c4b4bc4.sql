-- Drop and recreate the SELECT policy to allow all team members to see help requests
DROP POLICY IF EXISTS "Users can view relevant help requests" ON public.help_requests;

CREATE POLICY "Users can view relevant help requests"
ON public.help_requests
FOR SELECT
TO authenticated
USING (
  -- User is the requester
  requester_id = auth.uid()
  -- Or user is the helper
  OR helper_id = auth.uid()
  -- Or user is a member of the same team (any role)
  OR (team_id IS NOT NULL AND is_team_member(team_id, auth.uid()))
  -- Or it's a pending request without a team (public help request visible to all authenticated users)
  OR (team_id IS NULL AND status = 'pending')
);