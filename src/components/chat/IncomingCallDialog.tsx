import { useEffect, useState, useCallback } from 'react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { callRingtone, vibratePhone, stopVibration } from '@/utils/callRingtone';
import { Capacitor } from '@capacitor/core';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string | null;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallDialog = ({ 
  open, 
  callerName, 
  callerAvatar, 
  isVideo, 
  onAccept, 
  onDecline 
}: IncomingCallDialogProps) => {
  const [audioBlocked, setAudioBlocked] = useState(false);
  const isMobile = Capacitor.isNativePlatform() || window.innerWidth < 768;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Start ringtone and vibration when dialog opens
  useEffect(() => {
    if (!open) {
      callRingtone.stop();
      stopVibration();
      return;
    }

    try {
      callRingtone.playIncomingRing({ volume: 0.4, loop: true });
      setAudioBlocked(false);
    } catch (e) {
      setAudioBlocked(true);
    }

    if (isMobile) {
      const vibrateInterval = setInterval(() => {
        vibratePhone([200, 100, 200, 100, 200]);
      }, 2000);
      vibratePhone([200, 100, 200, 100, 200]);
      return () => {
        clearInterval(vibrateInterval);
        callRingtone.stop();
        stopVibration();
      };
    }

    return () => {
      callRingtone.stop();
      stopVibration();
    };
  }, [open, isMobile]);

  const handleUnblockAudio = useCallback(() => {
    try {
      callRingtone.playIncomingRing({ volume: 0.4, loop: true });
      setAudioBlocked(false);
    } catch { /* still blocked */ }
  }, []);

  const handleAccept = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callRingtone.stop();
    stopVibration();
    onAccept();
  }, [onAccept]);

  const handleDecline = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callRingtone.stop();
    stopVibration();
    onDecline();
  }, [onDecline]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{ background: 'hsl(var(--background) / 0.85)' }}
        >
          {/* Cosmic aurora backdrop */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
              style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)' }}
              animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
              style={{ background: 'radial-gradient(circle, hsl(var(--cosmic-cyan) / 0.1), transparent 70%)' }}
              animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 30, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'radial-gradient(circle, hsl(var(--cosmic-purple) / 0.08), transparent 70%)' }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Call card */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 flex flex-col items-center text-center p-10 max-w-sm mx-4"
          >
            {/* Audio blocked indicator */}
            {audioBlocked && (
              <button 
                className="absolute top-2 right-2 flex items-center gap-1.5 text-muted-foreground/70 hover:text-foreground text-xs transition-colors p-2"
                onClick={handleUnblockAudio}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Enable sound
              </button>
            )}

            {/* Avatar with animated cosmic rings */}
            <div className="relative mb-8">
              {/* Outermost pulse */}
              <motion.div
                className="absolute inset-[-32px] rounded-full"
                style={{ border: '1px solid hsl(var(--primary) / 0.15)' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              />
              {/* Middle ring */}
              <motion.div
                className="absolute inset-[-20px] rounded-full"
                style={{ border: '1.5px solid hsl(var(--primary) / 0.25)' }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
              {/* Inner glow ring */}
              <motion.div
                className="absolute inset-[-8px] rounded-full"
                style={{ background: 'hsl(var(--primary) / 0.1)' }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Avatar className="w-32 h-32 ring-4 ring-primary/25 shadow-2xl shadow-primary/20">
                  <AvatarImage src={callerAvatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-[hsl(var(--cosmic-purple))] text-primary-foreground text-4xl font-semibold">
                    {getInitials(callerName)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            </div>

            {/* Caller Info */}
            <div className="space-y-2 mb-10">
              <h3 className="text-2xl font-bold text-foreground">{callerName}</h3>
              <motion.p 
                className="text-muted-foreground flex items-center justify-center gap-2"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isVideo ? (
                  <><Video className="w-4 h-4" /> Incoming video call...</>
                ) : (
                  <><Phone className="w-4 h-4" /> Incoming voice call...</>
                )}
              </motion.p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-16">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  className="w-16 h-16 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 flex items-center justify-center transition-colors shadow-lg shadow-red-500/10"
                  onClick={handleDecline}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PhoneOff className="w-7 h-7" />
                </motion.button>
                <span className="text-xs text-muted-foreground">Decline</span>
              </div>
              
              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 text-white flex items-center justify-center transition-colors shadow-xl shadow-green-500/40"
                  onClick={handleAccept}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ boxShadow: [
                    '0 10px 25px -5px rgba(34, 197, 94, 0.3)',
                    '0 10px 40px -5px rgba(34, 197, 94, 0.5)',
                    '0 10px 25px -5px rgba(34, 197, 94, 0.3)',
                  ]}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                </motion.button>
                <span className="text-xs text-muted-foreground">Accept</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
