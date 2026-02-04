import { useCall } from '@/contexts/CallContext';
import { ResizableCallWindow } from './ResizableCallWindow';
import { HybridCallRoom } from './HybridCallRoom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * GlobalCallOverlay - Renders the active call as a floating PiP window
 * This component should be placed at the app root level so it persists
 * across all navigation and route changes.
 */
export const GlobalCallOverlay = () => {
  const { activeCall, endCurrentCall } = useCall();
  const { user } = useAuth();

  if (!activeCall || !user) return null;

  const participantName = user.email?.split('@')[0] || 'User';
  const roomName = `call-${activeCall.conversationId}`;

  return (
    <ResizableCallWindow
      onClose={endCurrentCall}
      title={activeCall.conversationName}
      minWidth={280}
      minHeight={200}
      maxWidth={1400}
      maxHeight={900}
      defaultWidth={640}
      defaultHeight={480}
    >
      <HybridCallRoom
        roomName={roomName}
        participantName={participantName}
        onDisconnect={endCurrentCall}
        initialVideo={activeCall.isVideo}
        initialAudio={true}
        isHost={activeCall.isCaller}
      />
    </ResizableCallWindow>
  );
};
