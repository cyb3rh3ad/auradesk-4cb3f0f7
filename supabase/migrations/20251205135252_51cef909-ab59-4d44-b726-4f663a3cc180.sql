-- Update the SELECT policy for meetings to include meeting creators
DROP POLICY IF EXISTS "Users can view meetings they are invited to or in their teams" ON public.meetings;

CREATE POLICY "Users can view meetings they are invited to or in their teams"
ON public.meetings
FOR SELECT
TO authenticated
USING (
  -- Meeting creator can always view their meetings
  auth.uid() = created_by
  -- Or user is a participant
  OR EXISTS (
    SELECT 1 FROM meeting_participants
    WHERE meeting_participants.meeting_id = meetings.id
    AND meeting_participants.user_id = auth.uid()
  )
  -- Or user is a team member
  OR EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = meetings.team_id
    AND team_members.user_id = auth.uid()
  )
);