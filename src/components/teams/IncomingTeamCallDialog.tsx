import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, Users, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { callRingtone, vibratePhone, stopVibration } from '@/utils/callRingtone';
import { Capacitor } from '@capacitor/core';

interface IncomingTeamCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string | null;
  teamName: string;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingTeamCallDialog = ({ 
  open, 
  callerName, 
  callerAvatar, 
  teamName,
  isVideo, 
  onAccept, 
  onDecline 
}: IncomingTeamCallDialogProps) => {
  const [audioBlocked, setAudioBlocked] = useState(false);
  const isMobile = Capacitor.isNativePlatform() || window.innerWidth < 768;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Start team ringtone and vibration
  useEffect(() => {
    if (!open) {
      callRingtone.stop();
      stopVibration();
      return;
    }

    try {
      callRingtone.playTeamRing({ volume: 0.35, loop: true });
      setAudioBlocked(false);
    } catch (e) {
      console.log('Team ringtone blocked:', e);
      setAudioBlocked(true);
    }

    if (isMobile) {
      const vibrateInterval = setInterval(() => {
        vibratePhone([150, 100, 150, 100, 150]);
      }, 1800);

      vibratePhone([150, 100, 150, 100, 150]);

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
      callRingtone.playTeamRing({ volume: 0.35, loop: true });
      setAudioBlocked(false);
    } catch (e) {
      console.log('Still blocked:', e);
    }
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
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
          <DialogContent 
            className="max-w-[95vw] sm:max-w-sm p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] rounded-3xl shadow-2xl shadow-accent/20"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <VisuallyHidden.Root>
              <DialogTitle>Incoming team call from {callerName}</DialogTitle>
              <DialogDescription>Join or decline the {isVideo ? 'video' : 'voice'} call in {teamName}</DialogDescription>
            </VisuallyHidden.Root>

            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 pointer-events-none" />

            <div className="relative p-8 flex flex-col items-center text-center space-y-6">
              {/* Audio blocked indicator */}
              {audioBlocked && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-3 right-3 text-muted-foreground/70 hover:text-foreground z-10"
                  onClick={handleUnblockAudio}
                >
                  <Volume2 className="w-4 h-4 mr-1.5" />
                  <span className="text-xs">Enable sound</span>
                </Button>
              )}

              {/* Team Icon with animated rings */}
              <div className="relative">
                <motion.div 
                  className="absolute inset-[-20px] rounded-full border-2 border-accent/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div 
                  className="absolute inset-[-12px] rounded-full border-2 border-accent/30"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0.3, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
                <motion.div 
                  className="absolute inset-[-4px] rounded-full bg-accent/20"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
                
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center relative ring-4 ring-accent/30 shadow-xl shadow-accent/20">
                  <Users className="w-12 h-12 text-primary-foreground" />
                </div>
              </div>

              {/* Call Info */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">{teamName}</h3>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={callerAvatar || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/20">
                      {getInitials(callerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{callerName} started a call</span>
                </div>
                <motion.p 
                  className="text-muted-foreground flex items-center justify-center gap-2"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {isVideo ? (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Team video call...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      <span>Team voice call...</span>
                    </>
                  )}
                </motion.p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-12 pt-4 relative z-50">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-16 h-16 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-colors touch-manipulation shadow-lg shadow-red-500/20"
                    onClick={handleDecline}
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Decline</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(34, 197, 94, 0.3)',
                      '0 0 40px rgba(34, 197, 94, 0.4)',
                      '0 0 20px rgba(34, 197, 94, 0.3)'
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="rounded-full"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 text-white transition-colors touch-manipulation"
                    onClick={handleAccept}
                  >
                    {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Join</p>
                </motion.div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
