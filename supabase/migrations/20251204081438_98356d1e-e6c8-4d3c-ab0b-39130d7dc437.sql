-- Allow users to delete friendships they're part of (for declining requests)
CREATE POLICY "Users can delete friendships they're part of"
ON public.friendships
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);