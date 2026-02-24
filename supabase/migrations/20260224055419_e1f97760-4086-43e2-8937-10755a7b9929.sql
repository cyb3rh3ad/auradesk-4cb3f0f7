
-- Decision Rooms: collaborative voting/polling for teams
CREATE TABLE public.decision_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, closed, archived
  voting_type TEXT NOT NULL DEFAULT 'single', -- single, multiple, ranked
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Options for each decision room
CREATE TABLE public.decision_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.decision_rooms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT, -- for visual differentiation
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Votes cast by users
CREATE TABLE public.decision_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.decision_rooms(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.decision_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rank INTEGER, -- for ranked voting
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, option_id, user_id) -- one vote per option per user
);

-- Enable RLS
ALTER TABLE public.decision_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_votes ENABLE ROW LEVEL SECURITY;

-- Decision Rooms policies
-- Team members can view rooms in their teams, or rooms they created
CREATE POLICY "Users can view decision rooms" ON public.decision_rooms
  FOR SELECT USING (
    (created_by = auth.uid()) OR
    (team_id IS NOT NULL AND is_team_member(team_id, auth.uid()))
  );

CREATE POLICY "Users can create decision rooms" ON public.decision_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    (team_id IS NULL OR is_team_member(team_id, auth.uid()))
  );

CREATE POLICY "Creators can update their rooms" ON public.decision_rooms
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their rooms" ON public.decision_rooms
  FOR DELETE USING (auth.uid() = created_by);

-- Decision Options policies
CREATE POLICY "Users can view options" ON public.decision_options
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.decision_rooms dr WHERE dr.id = room_id AND (
      dr.created_by = auth.uid() OR
      (dr.team_id IS NOT NULL AND is_team_member(dr.team_id, auth.uid()))
    ))
  );

CREATE POLICY "Room creators can manage options" ON public.decision_options
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.decision_rooms dr WHERE dr.id = room_id AND dr.created_by = auth.uid())
  );

CREATE POLICY "Room creators can delete options" ON public.decision_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.decision_rooms dr WHERE dr.id = room_id AND dr.created_by = auth.uid())
  );

-- Decision Votes policies
CREATE POLICY "Users can view votes" ON public.decision_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.decision_rooms dr WHERE dr.id = room_id AND (
      dr.created_by = auth.uid() OR
      (dr.team_id IS NOT NULL AND is_team_member(dr.team_id, auth.uid()))
    ))
  );

CREATE POLICY "Users can cast votes" ON public.decision_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.decision_rooms dr WHERE dr.id = room_id AND dr.status = 'active' AND (
      dr.created_by = auth.uid() OR
      (dr.team_id IS NOT NULL AND is_team_member(dr.team_id, auth.uid()))
    ))
  );

CREATE POLICY "Users can remove their votes" ON public.decision_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for votes (live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_rooms;

-- Timestamp trigger
CREATE TRIGGER update_decision_rooms_updated_at
  BEFORE UPDATE ON public.decision_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
