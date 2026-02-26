
-- Add UPDATE policy so upserts work for web push subscriptions
CREATE POLICY "Users can update their own web push subscriptions"
  ON public.web_push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
