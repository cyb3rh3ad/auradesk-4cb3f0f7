import { useState, useEffect, useRef } from 'react';
import { Send, Users, Phone, Video, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  conversationName: string;
  isGroup?: boolean;
}

export const MessageArea = ({ messages, onSendMessage, conversationName, isGroup }: MessageAreaProps) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
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
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
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

      {/* Input */}
      <div className="p-4 border-t border-border/40 bg-card/30 backdrop-blur-sm shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
