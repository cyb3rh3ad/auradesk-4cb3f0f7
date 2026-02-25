
-- QR Login sessions table
CREATE TABLE public.qr_login_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, expired
  approved_by UUID, -- user who scanned and approved
  access_token TEXT, -- the token to pass to desktop
  refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS
ALTER TABLE public.qr_login_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create a QR session (desktop, unauthenticated)
CREATE POLICY "Anyone can create QR sessions" ON public.qr_login_sessions
  FOR INSERT WITH CHECK (true);

-- Anyone can read QR sessions by token (for polling)
CREATE POLICY "Anyone can read QR sessions" ON public.qr_login_sessions
  FOR SELECT USING (true);

-- Authenticated users can approve sessions
CREATE POLICY "Authenticated users can approve" ON public.qr_login_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable realtime for polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_login_sessions;
