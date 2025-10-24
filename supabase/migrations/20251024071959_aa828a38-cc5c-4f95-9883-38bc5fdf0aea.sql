-- Create help requests table
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES public.teams(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'resolved', 'cancelled')),
  helper_id UUID REFERENCES auth.users(id),
  connection_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- Policies for help requests
CREATE POLICY "Users can create help requests"
  ON public.help_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view help requests in their teams"
  ON public.help_requests
  FOR SELECT
  USING (
    auth.uid() = requester_id OR
    auth.uid() = helper_id OR
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = help_requests.team_id
      AND team_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update help requests they're involved in"
  ON public.help_requests
  FOR UPDATE
  USING (
    auth.uid() = requester_id OR
    auth.uid() = helper_id
  );

-- Add trigger for updated_at
CREATE TRIGGER update_help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_requests;