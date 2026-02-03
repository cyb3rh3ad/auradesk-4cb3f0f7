import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/hooks/useTeams';
import { HybridCallRoom } from '@/components/call/HybridCallRoom';
import { ResizableCallWindow } from '@/components/call/ResizableCallWindow';

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

  if (!user || !open) return null;

  // Generate unique room name based on team
  const roomName = `team-call-${team.id}`;

  return (
    <ResizableCallWindow
      onClose={onClose}
      title={`${team.name} - Team Call`}
      defaultWidth={800}
      defaultHeight={600}
      minWidth={360}
      minHeight={280}
      maxWidth={1400}
      maxHeight={1000}
    >
      <HybridCallRoom
        roomName={roomName}
        participantName={userName}
        onDisconnect={onClose}
        className="h-full"
        initialVideo={isVideo}
        initialAudio={true}
        isHost={isHost}
      />
    </ResizableCallWindow>
  );
};
