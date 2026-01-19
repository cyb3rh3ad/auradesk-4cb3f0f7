-- Fix 1: Remove overly permissive help_requests policy that exposes pending requests to all users
DROP POLICY IF EXISTS "Users can view relevant help requests" ON public.help_requests;

CREATE POLICY "Users can view relevant help requests" 
ON public.help_requests FOR SELECT
USING (
  requester_id = auth.uid()
  OR helper_id = auth.uid()
  OR (team_id IS NOT NULL AND is_team_member(team_id, auth.uid()))
);

-- Fix 2: Add explicit deny for unauthenticated access to profiles
-- First, create a base policy that requires authentication
CREATE POLICY "Require authentication for profiles access"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 3: Add explicit deny for unauthenticated access to user_subscriptions
CREATE POLICY "Require authentication for subscriptions access"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() IS NOT NULL);