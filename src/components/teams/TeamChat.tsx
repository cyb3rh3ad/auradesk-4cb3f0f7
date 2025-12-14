import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamChat, TeamMessage } from '@/hooks/useTeamChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useTeamCallInvitations } from '@/hooks/useTeamCallInvitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, ArrowLeft, Users, Phone, Video } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Team } from '@/hooks/useTeams';
import { TeamCallDialog } from './TeamCallDialog';

interface TeamChatProps {
  team: Team;
  onBack: () => void;
}

export const TeamChat = ({ team, onBack }: TeamChatProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, conversationId } = useTeamChat(team.id);
  const { typingUsers, sendTypingEvent, stopTyping } = useTypingIndicator(conversationId);
  const { sendTeamCallInvitation } = useTeamCallInvitations();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callIsVideo, setCallIsVideo] = useState(false);

  const handleStartCall = async (isVideo: boolean) => {
    setCallIsVideo(isVideo);
    setCallDialogOpen(true);
    // Send invitation to all team members
    await sendTeamCallInvitation(team.id, team.name, isVideo);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (user?.email) {
      sendTypingEvent(user.email.split('@')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const message = input;
    setInput('');
    if (user?.email) {
      stopTyping(user.email.split('@')[0]);
    }
    await sendMessage(message);
  };

  const getInitials = (sender: TeamMessage['sender']) => {
    if (!sender) return '?';
    if (sender.full_name) {
      return sender.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (sender.username) {
      return sender.username.slice(0, 2).toUpperCase();
    }
    return sender.email.slice(0, 2).toUpperCase();
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const groupedMessages = messages.reduce((groups, message, index) => {
    const prev = messages[index - 1];
    const isSameSender = prev && prev.sender_id === message.sender_id;
    const isWithinMinute = prev && 
      new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() < 60000;

    if (isSameSender && isWithinMinute) {
      groups[groups.length - 1].messages.push(message);
    } else {
      groups.push({ sender: message.sender, senderId: message.sender_id, messages: [message] });
    }
    return groups;
  }, [] as { sender: TeamMessage['sender']; senderId: string; messages: TeamMessage[] }[]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card/50">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {team.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{team.name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleStartCall(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleStartCall(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Video className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Users className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation with your team!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, groupIndex) => {
              const isOwn = group.senderId === user?.id;
              return (
                <div key={groupIndex} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={group.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(group.sender)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {group.sender?.full_name || group.sender?.username || group.sender?.email?.split('@')[0]}
                      </span>
                    )}
                    {group.messages.map((message, msgIndex) => (
                      <div
                        key={message.id}
                        className={`px-3 py-2 rounded-2xl ${
                          isOwn 
                            ? 'bg-primary text-primary-foreground rounded-br-md' 
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        {msgIndex === group.messages.length - 1 && (
                          <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {formatMessageDate(message.created_at)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-card/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Team Call Dialog */}
      <TeamCallDialog
        team={team}
        isVideo={callIsVideo}
        open={callDialogOpen}
        onClose={() => setCallDialogOpen(false)}
        isHost={true}
      />
    </div>
  );
};
