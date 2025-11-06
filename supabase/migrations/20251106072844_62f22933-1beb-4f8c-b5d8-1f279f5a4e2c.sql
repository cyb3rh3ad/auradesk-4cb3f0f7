-- Fix 1: Restrict profiles table to only show profiles of users with established relationships
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create more restrictive policies for profiles viewing
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Users can view profiles of people in their conversations
CREATE POLICY "Users can view conversation members profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members cm1
    JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = public.profiles.id
  )
);

-- Users can view profiles of people in their teams
CREATE POLICY "Users can view team members profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid()
    AND tm2.user_id = public.profiles.id
  )
);

-- Users can view profiles of their friends
CREATE POLICY "Users can view friends profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.friendships
    WHERE ((user_id = auth.uid() AND friend_id = public.profiles.id)
    OR (friend_id = auth.uid() AND user_id = public.profiles.id))
    AND status = 'accepted'
  )
);

-- Fix 2: Restrict help_requests to only requester, assigned helper, and team admins/owners
DROP POLICY IF EXISTS "Users can view help requests in their teams" ON public.help_requests;

-- Create more restrictive policy for help requests
CREATE POLICY "Users can view relevant help requests" 
ON public.help_requests 
FOR SELECT 
USING (
  -- The requester can see their own requests
  requester_id = auth.uid()
  OR
  -- The assigned helper can see requests assigned to them
  helper_id = auth.uid()
  OR
  -- Team admins and owners can see all requests in their team
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = help_requests.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  )
);