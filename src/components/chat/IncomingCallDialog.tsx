import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { getModernRingtone } from '@/utils/ringtone';

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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Play ringtone when dialog opens
  useEffect(() => {
    if (!open) return;

    let intervalId: NodeJS.Timeout | null = null;
    const ringtoneUrl = getModernRingtone();
    
    const playRing = async () => {
      try {
        const audio = new Audio(ringtoneUrl);
        audio.volume = 0.6;
        await audio.play();
        setAudioBlocked(false);
      } catch (e) {
        console.log('Ringtone blocked by browser:', e);
        setAudioBlocked(true);
      }
    };

    // Play immediately and every 2 seconds (longer ringtone needs more gap)
    playRing();
    intervalId = setInterval(playRing, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [open]);

  const handleUnblockAudio = async () => {
    try {
      const ringtoneUrl = getModernRingtone();
      const audio = new Audio(ringtoneUrl);
      audio.volume = 0.6;
      await audio.play();
      setAudioBlocked(false);
    } catch (e) {
      console.log('Still blocked:', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent 
        className="max-w-[90vw] sm:max-w-sm p-0 gap-0 border-border/50 bg-card overflow-hidden fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] mx-4 safe-area-inset"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Incoming call from {callerName}</DialogTitle>
          <DialogDescription>Accept or decline the {isVideo ? 'video' : 'voice'} call</DialogDescription>
        </VisuallyHidden.Root>
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          {/* Audio blocked indicator */}
          {audioBlocked && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute top-2 right-2 text-muted-foreground z-10"
              onClick={handleUnblockAudio}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              Enable sound
            </Button>
          )}

          {/* Caller Avatar with pulsing ring animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 animate-pulse" />
            <Avatar className="w-24 h-24 relative ring-4 ring-primary/20">
              <AvatarImage src={callerAvatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                {getInitials(callerName)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{callerName}</h3>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              {isVideo ? (
                <>
                  <Video className="w-4 h-4" />
                  <span>Incoming video call...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Incoming voice call...</span>
                </>
              )}
            </p>
          </div>

          {/* Action Buttons - Mobile optimized with larger touch targets */}
          <div className="flex items-center gap-8 pt-2 relative z-50">
            <Button
              variant="ghost"
              size="icon"
              className="w-18 h-18 min-w-[72px] min-h-[72px] rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-all hover:scale-105 active:scale-95 touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDecline();
              }}
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="w-18 h-18 min-w-[72px] min-h-[72px] rounded-full bg-green-500 hover:bg-green-400 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/30 touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAccept();
              }}
            >
              {isVideo ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
