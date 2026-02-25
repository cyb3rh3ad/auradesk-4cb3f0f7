import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, QrCode, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRScannerDialog({ open, onOpenChange }: QRScannerDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'scanning' | 'approving' | 'approved' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');
  const scanningRef = useRef(true);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      scanForQR();
    } catch (e) {
      console.error('Camera error:', e);
      setErrorMsg('Could not access camera. Please grant camera permissions.');
      setStatus('error');
    }
  }, []);

  // Use BarcodeDetector API (available in modern browsers)
  const scanForQR = useCallback(async () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanForQR);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    try {
      // Try BarcodeDetector (Chrome, Edge, Android)
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          const token = barcodes[0].rawValue;
          if (token && token.length === 64) { // Our hex tokens are 64 chars
            scanningRef.current = false;
            await approveLogin(token);
            return;
          }
        }
      }
    } catch (e) {
      // BarcodeDetector not available, fall through
    }

    if (scanningRef.current) {
      requestAnimationFrame(scanForQR);
    }
  }, []);

  const approveLogin = async (token: string) => {
    setStatus('approving');
    try {
      const { data, error } = await supabase.functions.invoke('qr-login-approve', {
        body: { token },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStatus('approved');
      toast({ title: 'Login approved!', description: 'The other device is now logged in.' });
      setTimeout(() => onOpenChange(false), 2000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to approve login');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (open) {
      setStatus('scanning');
      setErrorMsg('');
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [open, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at the QR code on your desktop to log in
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-black">
          {status === 'scanning' && (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-48 h-48 border-2 border-primary rounded-2xl"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
                Align QR code within the frame
              </p>
            </>
          )}

          {status === 'approving' && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-background">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Approving login...</p>
            </div>
          )}

          {status === 'approved' && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full h-full flex flex-col items-center justify-center bg-background">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-sm font-medium text-green-500">Login Approved!</p>
              <p className="text-xs text-muted-foreground mt-1">The other device is now logged in</p>
            </motion.div>
          )}

          {status === 'error' && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-background p-4">
              <XCircle className="w-10 h-10 text-destructive mb-3" />
              <p className="text-sm text-destructive text-center">{errorMsg}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                setStatus('scanning');
                setErrorMsg('');
                startCamera();
              }}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        {!('BarcodeDetector' in (typeof window !== 'undefined' ? window : {})) && status === 'scanning' && (
          <p className="text-xs text-yellow-500 text-center">
            QR scanning works best on Chrome/Edge. If scanning doesn't work, try a different browser.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
