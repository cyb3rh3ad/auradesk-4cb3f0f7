import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Team } from '@/hooks/useTeams';
import { LiveKitRoom } from '@/components/livekit/LiveKitRoom';

interface TeamCallDialogProps {
  team: Team;
  isVideo: boolean;
  open: boolean;
  onClose: () => void;
}

export const TeamCallDialog = ({ team, isVideo, open, onClose }: TeamCallDialogProps) => {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>('User');

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, username, email')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserName(data.full_name || data.username || data.email || 'User');
      }
    };
    fetchProfile();
  }, [user]);

  if (!user) return null;

  // Generate unique room name based on team
  const roomName = `team-call-${team.id}`;

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-none overflow-hidden max-w-5xl w-full h-[85vh] bg-background">
        <VisuallyHidden.Root>
          <DialogTitle>Team Call - {team.name}</DialogTitle>
        </VisuallyHidden.Root>
        <LiveKitRoom
          roomName={roomName}
          participantName={userName}
          onDisconnect={onClose}
          className="h-full"
          initialVideo={isVideo}
          initialAudio={true}
        />
      </DialogContent>
    </Dialog>
  );
};
