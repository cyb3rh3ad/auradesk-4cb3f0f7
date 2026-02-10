import { useState, useRef, useCallback } from 'react';
import { Camera, X, Send, SwitchCamera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/utils/haptics';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export const CameraCapture = ({ onCapture, disabled }: CameraCaptureProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoading(false);
    } catch (err) {
      console.error('Camera access failed:', err);
      setLoading(false);
      setIsOpen(false);
    }
  }, []);

  const openCamera = useCallback(async () => {
    setIsOpen(true);
    setCapturedImage(null);
    triggerHaptic('light');
    await startCamera(facingMode);
  }, [facingMode, startCamera]);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsOpen(false);
    setCapturedImage(null);
  }, []);

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
    
    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    triggerHaptic('medium');
    
    // Stop camera while reviewing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [facingMode]);

  const sendPhoto = useCallback(() => {
    if (!capturedImage) return;
    
    // Convert data URL to blob directly - more reliable than canvas.toBlob()
    const [meta, base64Data] = capturedImage.split(',');
    const mimeMatch = meta.match(/^data:(.*?);/);
    const mimeType = mimeMatch?.[1] || 'image/jpeg';
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    triggerHaptic('light');
    closeCamera();
  }, [capturedImage, onCapture, closeCamera]);

  const retake = useCallback(async () => {
    setCapturedImage(null);
    await startCamera(facingMode);
  }, [facingMode, startCamera]);

  return (
    <>
      {/* Camera button */}
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

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Fullscreen camera overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
          >
            {/* Camera preview or captured image */}
            <div className="flex-1 relative overflow-hidden">
              {capturedImage ? (
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "w-full h-full object-cover",
                      facingMode === 'user' && "scale-x-[-1]"
                    )}
                  />
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Controls */}
            <div className="bg-black/80 backdrop-blur-xl px-6 py-6 safe-area-pb">
              {capturedImage ? (
                <div className="flex items-center justify-between">
                  {/* Retake */}
                  <button
                    onClick={retake}
                    className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  {/* Send */}
                  <motion.button
                    onClick={sendPhoto}
                    whileTap={{ scale: 0.9 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/40 touch-manipulation"
                  >
                    <Send className="w-7 h-7" />
                  </motion.button>
                  
                  <div className="w-14" /> {/* Spacer */}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  {/* Close */}
                  <button
                    onClick={closeCamera}
                    className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  {/* Shutter */}
                  <motion.button
                    onClick={takePhoto}
                    whileTap={{ scale: 0.85 }}
                    className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center touch-manipulation"
                  >
                    <div className="w-[60px] h-[60px] rounded-full bg-white" />
                  </motion.button>
                  
                  {/* Switch camera */}
                  <button
                    onClick={switchCamera}
                    className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation"
                  >
                    <SwitchCamera className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
