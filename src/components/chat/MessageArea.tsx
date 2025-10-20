import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  conversationName: string;
}

export const MessageArea = ({ messages, onSendMessage, conversationName }: MessageAreaProps) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-border/50 px-6 flex items-center bg-card/30 backdrop-blur-sm">
        <h2 className="text-lg font-semibold">{conversationName}</h2>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            const senderName = message.sender?.full_name || message.sender?.email || 'Unknown';

            return (
              <div
                key={message.id}
                className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
              >
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarImage src={message.sender?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                    {getInitials(senderName)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{senderName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'px-4 py-2 rounded-2xl',
                      isOwn
                        ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
