-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a permissive INSERT policy that allows authenticated users to create conversations
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);