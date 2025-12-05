import { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Play ringtone when dialog opens
  useEffect(() => {
    if (open) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      let intervalId: NodeJS.Timeout | null = null;

      const playRingTone = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 523.25; // C5 note - different tone for team calls
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        
        // Second tone
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 659.25; // E5 note
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.4);
        }, 200);
      };

      playRingTone();
      intervalId = setInterval(playRingTone, 2500);

      return () => {
        if (intervalId) clearInterval(intervalId);
        audioContext.close();
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-sm p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>Incoming team call from {callerName}</DialogTitle>
          <DialogDescription>Join or decline the {isVideo ? 'video' : 'voice'} call in {teamName}</DialogDescription>
        </VisuallyHidden.Root>
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          {/* Team Icon with pulsing ring animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 animate-pulse" />
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center relative ring-4 ring-primary/20">
              <Users className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          {/* Call Info */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{teamName}</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Avatar className="w-5 h-5">
                <AvatarImage src={callerAvatar || undefined} />
                <AvatarFallback className="text-xs bg-primary/20">
                  {getInitials(callerName)}
                </AvatarFallback>
              </Avatar>
              <span>{callerName} started a call</span>
            </div>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
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
                "bg-green-500 hover:bg-green-600 text-white"
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
