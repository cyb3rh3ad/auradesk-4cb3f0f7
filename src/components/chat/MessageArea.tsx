import { useState, useEffect, useRef } from 'react';
import { Send, Users, Phone, Video, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessageAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  conversationName: string;
  isGroup?: boolean;
  conversationId: string | null;
}

export const MessageArea = ({ messages, onSendMessage, conversationName, isGroup, conversationId }: MessageAreaProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isStartingCall, setIsStartingCall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { typingUsers, sendTypingEvent, stopTyping } = useTypingIndicator(conversationId);

  // Get current user's display name for typing events
  const currentUserName = user?.user_metadata?.full_name || user?.email || 'Someone';

  const startCall = async (withVideo: boolean) => {
    if (!user || !conversationId) return;
    
    setIsStartingCall(true);
    try {
      // Create a meeting for this call
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          title: `Call with ${conversationName}`,
          created_by: user.id,
          scheduled_at: new Date().toISOString(),
          status: 'in_progress',
          meeting_link: crypto.randomUUID(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add current user as participant
      await supabase.from('meeting_participants').insert({
        meeting_id: meeting.id,
        user_id: user.id,
        status: 'joined',
      });

      toast.success(withVideo ? 'Starting video call...' : 'Starting voice call...');
      navigate(`/meetings?room=${meeting.id}&video=${withVideo}`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    } finally {
      setIsStartingCall(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      sendTypingEvent(currentUserName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    stopTyping(currentUserName);
    onSendMessage(input);
    setInput('');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }
    return format(date, 'MMM d, HH:mm');
  };

  // Group consecutive messages from the same sender
  const groupedMessages = messages.reduce((acc: any[], message, index) => {
    const prevMessage = messages[index - 1];
    const isSameSender = prevMessage && prevMessage.sender_id === message.sender_id;
    const isWithinTimeframe = prevMessage && 
      (new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()) < 60000; // 1 minute

    if (isSameSender && isWithinTimeframe) {
      acc[acc.length - 1].messages.push(message);
    } else {
      acc.push({
        sender: message.sender,
        sender_id: message.sender_id,
        messages: [message],
      });
    }
    return acc;
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Conversation Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-border/40 bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className={cn(
              "text-sm font-medium",
              isGroup 
                ? "bg-gradient-to-br from-primary/20 to-accent/20 text-primary"
                : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
            )}>
              {isGroup ? <Users className="w-5 h-5" /> : getInitials(conversationName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-foreground">{conversationName}</h2>
            <p className="text-xs text-muted-foreground">
              {isGroup ? 'Group conversation' : 'Direct message'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => startCall(false)}
            disabled={isStartingCall}
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => startCall(true)}
            disabled={isStartingCall}
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 md:p-6 space-y-6">
          {groupedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">No messages yet</p>
                <p className="text-muted-foreground/60 text-xs">Send a message to start the conversation</p>
              </div>
            </div>
          ) : (
            groupedMessages.map((group, groupIndex) => {
              const isOwn = group.sender_id === user?.id;
              const senderName = group.sender?.full_name || group.sender?.email || 'Unknown';
              const firstMessage = group.messages[0];

              return (
                <div
                  key={`group-${groupIndex}`}
                  className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
                >
                  <Avatar className="w-8 h-8 mt-1 shrink-0">
                    <AvatarImage src={group.sender?.avatar_url} />
                    <AvatarFallback className={cn(
                      "text-xs font-medium",
                      isOwn 
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getInitials(senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('flex flex-col max-w-[75%] gap-1', isOwn && 'items-end')}>
                    <div className={cn('flex items-center gap-2', isOwn && 'flex-row-reverse')}>
                      <span className="text-xs font-medium text-foreground/80">{isOwn ? 'You' : senderName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageDate(new Date(firstMessage.created_at))}
                      </span>
                    </div>
                    {group.messages.map((message: Message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'px-4 py-2.5 rounded-2xl shadow-sm',
                          isOwn
                            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-md'
                            : 'bg-card border border-border/50 rounded-tl-md'
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Typing Indicator & Input */}
      <div className="border-t border-border/40 bg-card/30 backdrop-blur-sm shrink-0">
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 pt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground/70">
                {typingUsers.map(u => u.username).join(', ')}
              </span>
              <span>is typing</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-4 flex gap-3 items-center">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 bg-background/80 border-border/50 focus-visible:ring-primary/30"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim()}
            className="shrink-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
