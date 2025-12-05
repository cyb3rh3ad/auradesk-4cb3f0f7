-- Add team_id column to conversations table to link team chats
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- Create index for faster team conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_team_id ON public.conversations(team_id);

-- Update RLS policy to allow team members to view team conversations
DROP POLICY IF EXISTS "Users can view own or member conversations" ON public.conversations;

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
  OR (team_id IS NOT NULL AND is_team_member(team_id, auth.uid()))
);

-- Allow team members to send messages to team conversations
DROP POLICY IF EXISTS "Users can send messages to conversations they're in" ON public.messages;

CREATE POLICY "Users can send messages to conversations they're in"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id 
      AND conversation_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id 
      AND c.team_id IS NOT NULL 
      AND is_team_member(c.team_id, auth.uid())
    )
  )
);

-- Allow team members to view messages in team conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = messages.conversation_id 
    AND conversation_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND c.team_id IS NOT NULL 
    AND is_team_member(c.team_id, auth.uid())
  )
);