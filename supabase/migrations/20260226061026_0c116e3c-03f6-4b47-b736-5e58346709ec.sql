
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read config (for VAPID public key)
CREATE POLICY "Authenticated users can read config"
  ON public.app_config FOR SELECT
  USING (auth.uid() IS NOT NULL);
