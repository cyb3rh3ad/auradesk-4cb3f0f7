import { useDecisionRooms } from '@/hooks/useDecisionRooms';
import { DecisionRoomCard } from './DecisionRoomCard';
import { CreateDecisionRoomDialog } from './CreateDecisionRoomDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Vote } from 'lucide-react';

interface DecisionRoomsPanelProps {
  teamId: string;
}

export function DecisionRoomsPanel({ teamId }: DecisionRoomsPanelProps) {
  const { rooms, loading, createRoom, castVote, closeRoom, deleteRoom } = useDecisionRooms(teamId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Decision Rooms</h3>
          {rooms.length > 0 && (
            <span className="text-xs text-muted-foreground">({rooms.length})</span>
          )}
        </div>
        <CreateDecisionRoomDialog onCreateRoom={createRoom} />
      </div>

      {/* Rooms list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {rooms.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Vote className="w-8 h-8 text-primary/60" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">No decisions yet</p>
                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto">
                  Create a Decision Room to let your team vote on important choices together
                </p>
              </div>
              <CreateDecisionRoomDialog
                onCreateRoom={createRoom}
                trigger={
                  <button className="text-xs text-primary font-medium hover:underline">
                    Create your first decision
                  </button>
                }
              />
            </div>
          ) : (
            rooms.map(room => (
              <DecisionRoomCard
                key={room.id}
                room={room}
                onVote={castVote}
                onClose={closeRoom}
                onDelete={deleteRoom}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
