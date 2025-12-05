import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Play ringtone when dialog opens
  useEffect(() => {
    if (open) {
      // Create oscillator-based ringtone
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      let oscillator: OscillatorNode | null = null;
      let gainNode: GainNode | null = null;
      let intervalId: NodeJS.Timeout | null = null;

      const playRingTone = () => {
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 440; // A4 note
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };

      // Play immediately and then every 2 seconds
      playRingTone();
      intervalId = setInterval(playRingTone, 2000);

      return () => {
        if (intervalId) clearInterval(intervalId);
        if (oscillator) {
          try { oscillator.stop(); } catch (e) {}
        }
        audioContext.close();
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-sm p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>Incoming call from {callerName}</DialogTitle>
          <DialogDescription>Accept or decline the {isVideo ? 'video' : 'voice'} call</DialogDescription>
        </VisuallyHidden.Root>
        <div className="p-8 flex flex-col items-center text-center space-y-6">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-6 pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
              onClick={onDecline}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-16 h-16 rounded-full",
                isVideo 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : "bg-green-500 hover:bg-green-600 text-white"
              )}
              onClick={onAccept}
            >
              {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};