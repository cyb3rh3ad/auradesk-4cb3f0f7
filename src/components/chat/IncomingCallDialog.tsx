import { useEffect, useState, useCallback } from 'react';
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
      callRingtone.playIncomingRing({ volume: 0.6, loop: true });
      setAudioBlocked(false);
    } catch (e) {
      setAudioBlocked(true);
    }

    if (isMobile) {
      const vibrateInterval = setInterval(() => {
        vibratePhone([400, 200, 400, 200, 400]);
      }, 2000);
      vibratePhone([400, 200, 400, 200, 400]);
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
      callRingtone.playIncomingRing({ volume: 0.6, loop: true });
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
        <>
          {/* Backdrop overlay - subtle dim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99998] bg-black/30 pointer-events-none"
          />

          {/* Top banner */}
          <motion.div
            initial={{ y: -120, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -120, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[99999] px-3 pt-3 pb-0 sm:px-6 sm:pt-4"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <div className="mx-auto max-w-xl">
              {/* Glowing border effect */}
              <motion.div
                className="absolute inset-0 rounded-2xl opacity-60"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(142 76% 36% / 0.3), hsl(var(--primary) / 0.3))',
                  backgroundSize: '200% 200%',
                  filter: 'blur(8px)',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />

              <div className="relative rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Top accent bar */}
                <motion.div
                  className="h-1 w-full"
                  style={{
                    background: 'linear-gradient(90deg, hsl(142 76% 36%), hsl(var(--primary)), hsl(142 76% 36%))',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />

                <div className="flex items-center gap-4 p-4">
                  {/* Avatar with pulse ring */}
                  <div className="relative flex-shrink-0">
                    <motion.div
                      className="absolute inset-[-4px] rounded-full"
                      style={{ border: '2px solid hsl(142 76% 36% / 0.5)' }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <Avatar className="w-14 h-14 ring-2 ring-green-500/30">
                      <AvatarImage src={callerAvatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-lg font-semibold">
                        {getInitials(callerName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Call info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-base">
                      {callerName}
                    </p>
                    <motion.p 
                      className="text-sm text-muted-foreground flex items-center gap-1.5"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {isVideo ? (
                        <><Video className="w-3.5 h-3.5" /> Incoming video call</>
                      ) : (
                        <><Phone className="w-3.5 h-3.5" /> Incoming voice call</>
                      )}
                    </motion.p>
                    {audioBlocked && (
                      <button 
                        className="text-xs text-muted-foreground/70 hover:text-foreground flex items-center gap-1 mt-0.5 transition-colors"
                        onClick={handleUnblockAudio}
                      >
                        <Volume2 className="w-3 h-3" />
                        Tap to enable sound
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Decline */}
                    <motion.button
                      className="w-12 h-12 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 flex items-center justify-center transition-colors"
                      onClick={handleDecline}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <PhoneOff className="w-5 h-5" />
                    </motion.button>
                    
                    {/* Accept */}
                    <motion.button
                      className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 text-white flex items-center justify-center transition-colors shadow-lg shadow-green-500/30"
                      onClick={handleAccept}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      animate={{ 
                        boxShadow: [
                          '0 4px 15px -3px rgba(34, 197, 94, 0.3)',
                          '0 4px 25px -3px rgba(34, 197, 94, 0.5)',
                          '0 4px 15px -3px rgba(34, 197, 94, 0.3)',
                        ]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
