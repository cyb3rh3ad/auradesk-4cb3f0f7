import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChannelMessages, TeamChannel } from '@/hooks/useTeamChannels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Hash } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface ChannelChatProps {
  channel: TeamChannel;
  teamName: string;
}

export function ChannelChat({ channel, teamName }: ChannelChatProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChannelMessages(channel.id);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(input);
    if (success) {
      setInput('');
    }
    setSending(false);
  };

  const getInitials = (sender: typeof messages[0]['sender']) => {
    if (!sender) return '?';
    if (sender.full_name) {
      return sender.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
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

  // Group messages by sender for cleaner display
  const groupedMessages = messages.reduce((groups, message, index) => {
    const prev = messages[index - 1];
    const isSameSender = prev && prev.sender_id === message.sender_id;
    const isWithinMinute =
      prev &&
      new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() < 60000;

    if (isSameSender && isWithinMinute) {
      groups[groups.length - 1].messages.push(message);
    } else {
      groups.push({
        sender: message.sender,
        senderId: message.sender_id,
        messages: [message],
      });
    }
    return groups;
  }, [] as { sender: typeof messages[0]['sender']; senderId: string; messages: typeof messages }[]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card/50">
        <Hash className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{channel.name}</h3>
          <p className="text-xs text-muted-foreground">{teamName}</p>
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
            <Hash className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-medium">Welcome to #{channel.name}</p>
            <p className="text-sm">This is the start of the channel.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, groupIndex) => {
              const isOwn = group.senderId === user?.id;
              return (
                <div key={groupIndex} className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={group.sender?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(group.sender)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">
                        {group.sender?.full_name ||
                          group.sender?.username ||
                          group.sender?.email?.split('@')[0] ||
                          'User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageDate(group.messages[0].created_at)}
                      </span>
                    </div>
                    {group.messages.map((message) => (
                      <p
                        key={message.id}
                        className="text-sm whitespace-pre-wrap break-words"
                      >
                        {message.content}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-card/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channel.name}`}
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || sending}>
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
