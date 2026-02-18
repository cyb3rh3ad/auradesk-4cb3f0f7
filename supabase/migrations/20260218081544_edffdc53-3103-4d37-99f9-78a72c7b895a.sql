
-- Pinned messages table
CREATE TABLE public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, message_id)
);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation members can view pins"
ON public.pinned_messages FOR SELECT
USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Conversation members can pin messages"
ON public.pinned_messages FOR INSERT
WITH CHECK (is_conversation_member(conversation_id, auth.uid()) AND auth.uid() = pinned_by);

CREATE POLICY "Conversation members can unpin messages"
ON public.pinned_messages FOR DELETE
USING (is_conversation_member(conversation_id, auth.uid()));

-- Scheduled messages table
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their scheduled messages"
ON public.scheduled_messages FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Users can create scheduled messages"
ON public.scheduled_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can update their scheduled messages"
ON public.scheduled_messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their scheduled messages"
ON public.scheduled_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Add mood_emoji column to profiles
ALTER TABLE public.profiles ADD COLUMN mood_emoji TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN mood_text TEXT DEFAULT NULL;

-- Enable realtime for pinned_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;
