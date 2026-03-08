-- Add edited_at and deleted_at columns to messages table for edit/delete support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Allow message senders to update their own messages (for editing)
CREATE POLICY "Users can edit their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow message senders to soft-delete their own messages
-- (We use UPDATE to set deleted_at rather than actual DELETE)
