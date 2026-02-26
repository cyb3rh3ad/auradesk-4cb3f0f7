
-- Fix infinite recursion: promises SELECT references promise_signatures, 
-- which references promises back. Break the cycle by using SECURITY DEFINER functions.

-- Create a helper function that checks promise access without triggering RLS on promise_signatures
CREATE OR REPLACE FUNCTION public.is_promise_signer(_promise_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.promise_signatures
    WHERE promise_id = _promise_id AND user_id = _user_id
  );
$$;

-- Create a helper function that checks promise ownership without triggering RLS on promises
CREATE OR REPLACE FUNCTION public.is_promise_accessible(_promise_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.promises
    WHERE id = _promise_id 
    AND (
      creator_id = _user_id 
      OR (team_id IS NOT NULL AND is_team_member(team_id, _user_id))
    )
  );
$$;

-- Drop and recreate promises SELECT policy using the SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can view relevant promises" ON public.promises;
CREATE POLICY "Users can view relevant promises"
ON public.promises FOR SELECT
USING (
  creator_id = auth.uid() 
  OR (team_id IS NOT NULL AND is_team_member(team_id, auth.uid()))
  OR is_promise_signer(id, auth.uid())
);

-- Drop and recreate promise_signatures SELECT policy using the SECURITY DEFINER function  
DROP POLICY IF EXISTS "Relevant users can view signatures" ON public.promise_signatures;
CREATE POLICY "Relevant users can view signatures"
ON public.promise_signatures FOR SELECT
USING (
  user_id = auth.uid()
  OR is_promise_accessible(promise_id, auth.uid())
);

-- Also create a promise_notifications table for the notification system
CREATE TABLE IF NOT EXISTS public.promise_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promise_id uuid NOT NULL REFERENCES public.promises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'signed', 'fulfilled', 'broken', 'reminder'
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promise_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.promise_notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert notifications for promise members"
ON public.promise_notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can mark their notifications as read"
ON public.promise_notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.promise_notifications FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for promise_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.promise_notifications;
