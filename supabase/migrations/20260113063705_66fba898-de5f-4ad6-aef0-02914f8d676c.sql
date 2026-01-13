-- Create team channels table (Discord-like categories with text/voice channels within teams)
CREATE TABLE public.team_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice')),
  category TEXT, -- Optional category grouping (like Discord categories)
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel messages table for text channels
CREATE TABLE public.channel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice channel participants table (who is currently in a voice channel)
CREATE TABLE public.voice_channel_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_camera_off BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(channel_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_channel_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_channels
CREATE POLICY "Team members can view channels"
ON public.team_channels
FOR SELECT
USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Team owners and admins can create channels"
ON public.team_channels
FOR INSERT
WITH CHECK (check_team_role(team_id, auth.uid(), ARRAY['owner', 'admin']));

CREATE POLICY "Team owners and admins can update channels"
ON public.team_channels
FOR UPDATE
USING (check_team_role(team_id, auth.uid(), ARRAY['owner', 'admin']));

CREATE POLICY "Team owners and admins can delete channels"
ON public.team_channels
FOR DELETE
USING (check_team_role(team_id, auth.uid(), ARRAY['owner', 'admin']));

-- RLS Policies for channel_messages
CREATE POLICY "Team members can view channel messages"
ON public.channel_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_channels tc
    WHERE tc.id = channel_messages.channel_id
    AND is_team_member(tc.team_id, auth.uid())
  )
);

CREATE POLICY "Team members can send messages"
ON public.channel_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.team_channels tc
    WHERE tc.id = channel_messages.channel_id
    AND is_team_member(tc.team_id, auth.uid())
  )
);

-- RLS Policies for voice_channel_participants
CREATE POLICY "Team members can view voice participants"
ON public.voice_channel_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_channels tc
    WHERE tc.id = voice_channel_participants.channel_id
    AND is_team_member(tc.team_id, auth.uid())
  )
);

CREATE POLICY "Users can join voice channels they have access to"
ON public.voice_channel_participants
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.team_channels tc
    WHERE tc.id = voice_channel_participants.channel_id
    AND is_team_member(tc.team_id, auth.uid())
  )
);

CREATE POLICY "Users can update their own voice status"
ON public.voice_channel_participants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave voice channels"
ON public.voice_channel_participants
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for voice participants and channel messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_channel_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;

-- Create trigger for updated_at on team_channels
CREATE TRIGGER update_team_channels_updated_at
BEFORE UPDATE ON public.team_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();