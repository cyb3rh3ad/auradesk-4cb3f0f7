import { Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        isGroup: true,
        avatar: null,
        initials: (convo.name || 'UG').slice(0, 2).toUpperCase(),
      };
    }

    // For private chats, show the other user's name
    const otherMember = convo.members?.find((m: any) => m.profiles?.id !== user?.id);
    const profile = otherMember?.profiles;
    
    const name = profile?.full_name || profile?.email || 'Unknown User';
    const initials = profile?.full_name 
      ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : (profile?.email?.slice(0, 2).toUpperCase() || 'UN');

    return {
      name,
      isGroup: false,
      avatar: profile?.avatar_url,
      initials,
    };
  };

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No conversations yet. Click on a friend to start chatting!
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((convo) => {
          const display = getConversationDisplay(convo);
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
              {display.isGroup ? (
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  isSelected 
                    ? 'bg-gradient-to-br from-primary to-accent shadow-lg' 
                    : 'bg-muted/50 group-hover:bg-muted'
                )}>
                  <Users className={cn(
                    'w-5 h-5',
                    isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                  )} />
                </div>
              ) : (
                <Avatar className="w-10 h-10">
                  <AvatarImage src={display.avatar || undefined} />
                  <AvatarFallback className={cn(
                    'text-xs',
                    isSelected 
                      ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground' 
                      : 'bg-gradient-to-br from-primary/20 to-accent/20'
                  )}>
                    {display.initials}
                  </AvatarFallback>
                </Avatar>
              )}
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
