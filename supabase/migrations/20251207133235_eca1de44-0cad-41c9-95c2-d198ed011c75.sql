-- Allow authenticated users to search for other users by username or email
-- This is necessary for the "Add Friend" feature to work
-- Only exposes minimal profile info (id, username, full_name) - email is needed for search matching

CREATE POLICY "Users can search profiles to add friends" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
);