-- Drop the existing SELECT policy that exposes pending requests to all users
DROP POLICY IF EXISTS "Users can view relevant help requests" ON public.help_requests;

-- Create a more restrictive policy that only allows viewing:
-- 1. Requests the user created (requester)
-- 2. Requests where the user is the assigned helper
-- 3. Requests within teams the user belongs to
CREATE POLICY "Users can view relevant help requests" 
ON public.help_requests 
FOR SELECT 
USING (
  (requester_id = auth.uid()) OR 
  (helper_id = auth.uid()) OR 
  ((team_id IS NOT NULL) AND is_team_member(team_id, auth.uid()))
);