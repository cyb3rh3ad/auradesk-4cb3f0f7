import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/utils/haptics';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100 
        } 
      });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Date.now() - startTimeRef.current;
        
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        
        if (duration > 500) { // Only save if longer than 0.5s
          setIsProcessing(true);
          onRecordingComplete(blob, duration);
          setTimeout(() => setIsProcessing(false), 500);
        }
      };

      mediaRecorder.start(100);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      triggerHaptic('medium');

      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    triggerHaptic('light');
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
    triggerHaptic('light');
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-full left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/30 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {/* Cancel button */}
              <button
                onClick={cancelRecording}
                className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Recording indicator */}
              <div className="flex-1 flex items-center gap-3">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                </div>
                <span className="text-sm font-medium text-foreground/80">
                  {formatTime(recordingDuration)}
                </span>
                {/* Waveform visualization */}
                <div className="flex-1 flex items-center gap-0.5 h-6">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 bg-primary/60 rounded-full"
                      animate={{
                        height: [4, Math.random() * 20 + 4, 4],
                      }}
                      transition={{
                        duration: 0.5 + Math.random() * 0.5,
                        repeat: Infinity,
                        delay: i * 0.05,
                      }}
                      style={{ minHeight: 4 }}
                    />
                  ))}
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={stopRecording}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all touch-manipulation"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <button
        type="button"
        disabled={disabled || isProcessing}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!disabled && !isProcessing) startRecording();
        }}
        className={cn(
          "h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 touch-manipulation",
          isRecording
            ? "bg-destructive/20 text-destructive scale-110"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          (disabled || isProcessing) && "opacity-50 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className={cn("w-5 h-5", isRecording && "animate-pulse")} />
        )}
      </button>
    </>
  );
};
