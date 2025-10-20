import { Users, Hash } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationsListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const ConversationsList = ({ conversations, selectedId, onSelect }: ConversationsListProps) => {
  const { user } = useAuth();

  const getConversationDisplay = (convo: Conversation) => {
    if (convo.is_group) {
      return {
        name: convo.name || 'Unnamed Group',
        icon: Users,
      };
    }

    // For private chats, show the other user's name
    const otherMember = convo.members?.find((m: any) => m.profiles?.id !== user?.id);
    return {
      name: otherMember?.profiles?.full_name || otherMember?.profiles?.email || 'Unknown User',
      icon: Hash,
    };
  };

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((convo) => {
          const display = getConversationDisplay(convo);
          const Icon = display.icon;
          const isSelected = convo.id === selectedId;

          return (
            <button
              key={convo.id}
              onClick={() => onSelect(convo.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:bg-accent/10 group',
                isSelected && 'bg-accent/20 shadow-md'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                isSelected 
                  ? 'bg-gradient-to-br from-primary to-accent shadow-lg' 
                  : 'bg-muted/50 group-hover:bg-muted'
              )}>
                <Icon className={cn(
                  'w-5 h-5',
                  isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {display.name}
                </p>
                {convo.is_group && (
                  <p className="text-xs text-muted-foreground">
                    {convo.members?.length || 0} members
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};
