import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, RefreshCw, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

interface QRLoginDisplayProps {
  onLoginSuccess: () => void;
}

export function QRLoginDisplay({ onLoginSuccess }: QRLoginDisplayProps) {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'generating' | 'ready' | 'approved' | 'expired'>('generating');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const channelRef = useRef<any>(null);

  const generateQR = async () => {
    setStatus('generating');
    try {
      const { data, error } = await supabase
        .from('qr_login_sessions')
        .insert({ status: 'pending' })
        .select()
        .single();

      if (error) throw error;
      setQrToken(data.token);
      setSessionId(data.id);
      setStatus('ready');
      setTimeLeft(300);
    } catch (e) {
      console.error('Failed to generate QR session:', e);
    }
  };

  // Generate on mount
  useEffect(() => {
    generateQR();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (status !== 'ready') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Realtime subscription for approval
  useEffect(() => {
    if (!sessionId || status === 'approved' || status === 'expired') return;

    channelRef.current = supabase
      .channel(`qr-login-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'qr_login_sessions',
        filter: `id=eq.${sessionId}`,
      }, async (payload: any) => {
        if (payload.new.status === 'approved') {
          setStatus('approved');
          // The access_token field contains the magic link action URL
          const actionLink = payload.new.access_token;
          const hashedToken = payload.new.refresh_token;
          
          if (hashedToken) {
            try {
              // Verify the OTP token hash to establish a session
              const { error } = await supabase.auth.verifyOtp({
                token_hash: hashedToken,
                type: 'magiclink',
              });
              if (!error) {
                // Flag QR login so MFA is bypassed — the phone scan IS the 2FA
                sessionStorage.setItem('qr_login_bypass_mfa', 'true');
                setTimeout(onLoginSuccess, 1500);
              } else {
                console.error('OTP verify error:', error);
                // Fallback: try navigating to the action link
                if (actionLink) {
                  window.location.href = actionLink;
                }
              }
            } catch (e) {
              console.error('Session transfer error:', e);
            }
          } else if (actionLink) {
            window.location.href = actionLink;
          }
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, status, onLoginSuccess]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Generate QR code as data URL client-side
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (!qrToken) { setQrDataUrl(null); return; }
    QRCode.toDataURL(qrToken, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(url => setQrDataUrl(url)).catch(() => setQrDataUrl(null));
  }, [qrToken]);

  return (
    <Card className="w-full max-w-sm mx-auto border-primary/10">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <QrCode className="w-5 h-5 text-primary" />
          QR Code Login
        </CardTitle>
        <CardDescription className="text-xs">
          Scan with your phone to log in instantly
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <AnimatePresence mode="wait">
          {status === 'generating' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-48 h-48 flex items-center justify-center rounded-lg bg-muted/30 border">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </motion.div>
          )}
          {status === 'ready' && qrDataUrl && (
            <motion.div key="qr" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="relative p-3 rounded-xl bg-white">
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
            </motion.div>
          )}
          {status === 'approved' && (
            <motion.div key="approved" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="w-48 h-48 flex flex-col items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-sm font-medium text-green-500">Approved!</p>
              <p className="text-xs text-muted-foreground">Logging you in...</p>
            </motion.div>
          )}
          {status === 'expired' && (
            <motion.div key="expired" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="w-48 h-48 flex flex-col items-center justify-center rounded-lg bg-muted/30 border">
              <Clock className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">QR Code Expired</p>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'ready' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Expires in {formatTime(timeLeft)}
          </div>
        )}

        {status === 'expired' && (
          <Button variant="outline" size="sm" onClick={generateQR} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Generate New Code
          </Button>
        )}

        {status === 'ready' && (
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">1. Open AuraDesk on your phone</p>
            <p className="text-xs text-muted-foreground">2. Go to Settings → QR Login Scanner</p>
            <p className="text-xs text-muted-foreground">3. Scan this code</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
