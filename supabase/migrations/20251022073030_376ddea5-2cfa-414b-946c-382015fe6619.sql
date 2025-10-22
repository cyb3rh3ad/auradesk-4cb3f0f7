-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Create meetings table
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  meeting_link text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create meeting participants table
CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'attended')),
  joined_at timestamptz,
  UNIQUE(meeting_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they are members of"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team owners and admins can update teams"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners can delete teams"
  ON public.teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'owner'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their teams"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_members.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
    OR auth.uid() = (SELECT created_by FROM public.teams WHERE id = team_members.team_id)
  );

CREATE POLICY "Team owners and admins can update member roles"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can remove members"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
    OR auth.uid() = team_members.user_id
  );

-- RLS Policies for meetings
CREATE POLICY "Users can view meetings they are invited to or in their teams"
  ON public.meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants
      WHERE meeting_participants.meeting_id = meetings.id
      AND meeting_participants.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = meetings.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      team_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.team_id = meetings.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Meeting creators can update meetings"
  ON public.meetings FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Meeting creators can delete meetings"
  ON public.meetings FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for meeting_participants
CREATE POLICY "Users can view participants of their meetings"
  ON public.meeting_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants mp
      WHERE mp.meeting_id = meeting_participants.meeting_id
      AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can add participants"
  ON public.meeting_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.created_by = auth.uid()
    )
  );

CREATE POLICY "Participants can update their own status"
  ON public.meeting_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Meeting creators can remove participants"
  ON public.meeting_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.created_by = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();