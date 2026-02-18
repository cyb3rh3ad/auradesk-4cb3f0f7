import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, SwitchCamera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/utils/haptics';
import { PhotoEditor } from './PhotoEditor';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [meta, base64Data] = dataUrl.split(',');
  const mimeMatch = meta.match(/^data:(.*?);/);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  const chunkSize = 8192;
  for (let i = 0; i < binaryString.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, binaryString.length);
    for (let j = i; j < end; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
  }
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
};

export const CameraCapture = ({ onCapture, disabled }: CameraCaptureProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      stopStream();
      setLoading(true);
      setError(null);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready before playing
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          // Timeout fallback
          setTimeout(() => resolve(), 3000);
        });
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setLoading(false);
      setError(err?.message || 'Could not access camera. Please grant camera permission.');
    }
  }, [stopStream]);

  const openCamera = useCallback(async () => {
    setIsOpen(true);
    setCapturedImage(null);
    setError(null);
    triggerHaptic('light');
    // Small delay to let the portal mount before starting camera
    setTimeout(() => startCamera(facingMode), 100);
  }, [facingMode, startCamera]);

  const closeCamera = useCallback(() => {
    stopStream();
    setIsOpen(false);
    setCapturedImage(null);
    setError(null);
  }, [stopStream]);

  const switchCamera = useCallback(async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    triggerHaptic('light');
    await startCamera(newFacing);
  }, [facingMode, startCamera]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    triggerHaptic('medium');
    stopStream();
  }, [facingMode, stopStream]);

  const handleEditorSend = useCallback((editedDataUrl: string) => {
    const file = dataUrlToFile(editedDataUrl, `snap_${Date.now()}.jpg`);
    onCapture(file);
    triggerHaptic('light');
    closeCamera();
  }, [onCapture, closeCamera]);

  const handleRetake = useCallback(async () => {
    setCapturedImage(null);
    setError(null);
    await startCamera(facingMode);
  }, [facingMode, startCamera]);

  // Use portal to render fullscreen overlay at document root
  // This escapes any parent overflow:hidden or z-index stacking contexts
  const cameraOverlay = isOpen ? createPortal(
    <AnimatePresence>
      {capturedImage ? (
        <PhotoEditor
          imageUrl={capturedImage}
          onSend={handleEditorSend}
          onRetake={handleRetake}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            // Use 100dvh for true fullscreen on mobile browsers
            height: '100dvh',
            width: '100vw',
          }}
        >
          {/* Camera viewfinder */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
                <Camera className="w-16 h-16 text-white/40 mb-4" />
                <p className="text-white text-lg font-medium mb-2">Camera Unavailable</p>
                <p className="text-white/60 text-sm mb-6">{error}</p>
                <button
                  onClick={closeCamera}
                  className="px-6 py-3 rounded-full bg-white/20 text-white font-medium"
                >
                  Go Back
                </button>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          {!error && (
            <div
              style={{
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(20px)',
                padding: '24px',
                paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
              }}
            >
              <div className="flex items-center justify-between max-w-sm mx-auto">
                {/* Close */}
                <button
                  onClick={closeCamera}
                  className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Shutter */}
                <motion.button
                  onClick={takePhoto}
                  whileTap={{ scale: 0.85 }}
                  disabled={loading}
                  className="w-[76px] h-[76px] rounded-full border-[4px] border-white flex items-center justify-center disabled:opacity-50"
                >
                  <div className="w-[64px] h-[64px] rounded-full bg-white" />
                </motion.button>

                {/* Flip */}
                <button
                  onClick={switchCamera}
                  className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-colors"
                >
                  <SwitchCamera className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openCamera}
        className={cn(
          "h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-all touch-manipulation",
          "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Camera className="w-5 h-5" />
      </button>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {cameraOverlay}
    </>
  );
};
