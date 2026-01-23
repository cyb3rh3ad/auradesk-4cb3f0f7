import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Team } from '@/hooks/useTeams';
import { HybridCallRoom } from '@/components/call/HybridCallRoom';

interface TeamCallDialogProps {
  team: Team;
  isVideo: boolean;
  open: boolean;
  onClose: () => void;
  isHost?: boolean;
}

export const TeamCallDialog = ({ team, isVideo, open, onClose, isHost = false }: TeamCallDialogProps) => {
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
      <DialogContent className="p-0 border-none overflow-hidden w-[calc(100vw-2rem)] max-w-5xl h-[85vh] max-h-[calc(100vh-2rem)] bg-background">
        <VisuallyHidden.Root>
          <DialogTitle>Team Call - {team.name}</DialogTitle>
        </VisuallyHidden.Root>
        <HybridCallRoom
          roomName={roomName}
          participantName={userName}
          onDisconnect={onClose}
          className="h-full"
          initialVideo={isVideo}
          initialAudio={true}
          isHost={isHost}
        />
      </DialogContent>
    </Dialog>
  );
};
