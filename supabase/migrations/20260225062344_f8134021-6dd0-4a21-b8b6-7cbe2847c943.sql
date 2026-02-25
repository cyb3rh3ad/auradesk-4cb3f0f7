
-- Tighten QR session INSERT to only allow setting expected defaults
DROP POLICY "Anyone can create QR sessions" ON public.qr_login_sessions;
CREATE POLICY "Anyone can create QR sessions" ON public.qr_login_sessions
  FOR INSERT WITH CHECK (
    status = 'pending' 
    AND approved_by IS NULL 
    AND access_token IS NULL 
    AND refresh_token IS NULL
  );
