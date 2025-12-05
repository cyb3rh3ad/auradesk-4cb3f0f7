-- Drop the restrictive policy and create a permissive one for conversation members
DROP POLICY IF EXISTS "Users can view conversation members profiles" ON profiles;

-- Create a permissive policy that allows users to view profiles of anyone in their conversations
CREATE POLICY "Users can view conversation members profiles" 
ON profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM conversation_members cm1
    JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = auth.uid() 
    AND cm2.user_id = profiles.id
  )
);

-- Also ensure authenticated users can view basic profile info
DROP POLICY IF EXISTS "Users can search profiles by username or email" ON profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (true);