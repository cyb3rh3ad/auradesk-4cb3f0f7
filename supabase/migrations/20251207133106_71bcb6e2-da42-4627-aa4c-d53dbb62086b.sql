-- Add a policy to allow viewing profiles of users who have sent you a friend request
-- This is necessary because the friend request sender's profile needs to be visible
-- to the receiver so they can see who is requesting friendship

CREATE POLICY "Users can view pending friend request senders profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM friendships
    WHERE friendships.user_id = profiles.id
      AND friendships.friend_id = auth.uid()
      AND friendships.status = 'pending'
  )
);

-- Also allow viewing profiles of users you have sent friend requests to
CREATE POLICY "Users can view pending friend request receivers profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM friendships
    WHERE friendships.friend_id = profiles.id
      AND friendships.user_id = auth.uid()
      AND friendships.status = 'pending'
  )
);