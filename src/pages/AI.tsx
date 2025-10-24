import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useAIChat } from '@/hooks/useAIChat';
import { Loader2, Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { isLoading, sendMessage } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    let assistantContent = '';
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: 'assistant', content: assistantContent, timestamp: new Date() }];
      });
    };

    try {
      await sendMessage(
        [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: input.trim() }],
        upsertAssistant,
        () => {}
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b p-4 bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">AI Assistant</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your intelligent team collaboration assistant
        </p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <Bot className="h-24 w-24 text-primary relative" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Your AI Assistant is Ready</h2>
              <p className="text-muted-foreground">
                Ask me anything! I can help with tasks, answer questions, provide suggestions, and more.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-4">
              <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setInput("Help me plan a team meeting")}>
                <p className="text-sm font-medium">Plan a meeting</p>
                <p className="text-xs text-muted-foreground">Get help organizing your next team sync</p>
              </Card>
              <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setInput("Suggest improvements for team collaboration")}>
                <p className="text-sm font-medium">Improve collaboration</p>
                <p className="text-xs text-muted-foreground">Get suggestions for better teamwork</p>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-accent">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4 bg-card/50 backdrop-blur">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1 bg-background"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Powered by Lovable AI
        </p>
      </div>
    </div>
  );
};

export default AI;
