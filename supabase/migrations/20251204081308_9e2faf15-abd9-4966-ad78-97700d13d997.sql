-- Allow users to search for profiles by username or email for adding friends
CREATE POLICY "Users can search profiles by username or email"
ON public.profiles
FOR SELECT
USING (true);