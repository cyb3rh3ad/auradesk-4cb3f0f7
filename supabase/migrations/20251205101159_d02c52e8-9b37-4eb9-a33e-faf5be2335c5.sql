-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a fully permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also need to allow users to see conversations they created even before members are added
DROP POLICY IF EXISTS "Users can view conversations they're members of" ON public.conversations;

CREATE POLICY "Users can view own or member conversations" 
ON public.conversations 
FOR SELECT 
TO authenticated
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM conversation_members 
    WHERE conversation_members.conversation_id = conversations.id 
    AND conversation_members.user_id = auth.uid()
  )
);