
-- Verified Promises table
CREATE TABLE public.promises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Promise signers (who needs to sign, and their signature data)
CREATE TABLE public.promise_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promise_id UUID NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  signature_data TEXT, -- base64 encoded signature image
  signed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, signed, declined
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one signature per user per promise
ALTER TABLE public.promise_signatures ADD CONSTRAINT unique_promise_signer UNIQUE (promise_id, user_id);

-- Enable RLS
ALTER TABLE public.promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_signatures ENABLE ROW LEVEL SECURITY;

-- Promises policies
CREATE POLICY "Users can create promises" ON public.promises
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view relevant promises" ON public.promises
  FOR SELECT USING (
    creator_id = auth.uid()
    OR (team_id IS NOT NULL AND is_team_member(team_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.promise_signatures ps WHERE ps.promise_id = promises.id AND ps.user_id = auth.uid())
  );

CREATE POLICY "Creators can update promises" ON public.promises
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete promises" ON public.promises
  FOR DELETE USING (auth.uid() = creator_id);

-- Signature policies
CREATE POLICY "Creators can add signers" ON public.promise_signatures
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.promises p WHERE p.id = promise_signatures.promise_id AND p.creator_id = auth.uid())
    OR auth.uid() = user_id
  );

CREATE POLICY "Relevant users can view signatures" ON public.promise_signatures
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.promises p WHERE p.id = promise_signatures.promise_id AND (
      p.creator_id = auth.uid()
      OR (p.team_id IS NOT NULL AND is_team_member(p.team_id, auth.uid()))
    ))
  );

CREATE POLICY "Signers can update their own signature" ON public.promise_signatures
  FOR UPDATE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_promises_updated_at
  BEFORE UPDATE ON public.promises
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.promises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promise_signatures;
