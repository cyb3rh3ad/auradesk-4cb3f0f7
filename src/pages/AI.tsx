import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useAIChat } from '@/hooks/useAIChat';
import { useAIChatSessions } from '@/hooks/useAIChatSessions';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { useSubscription } from '@/hooks/useSubscription';
import { AIChatSidebar } from '@/components/ai/AIChatSidebar';
import { AIModelSelector } from '@/components/ai/AIModelSelector';
import { Loader2, Send, Bot, User, Sparkles, Menu, X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionPlan } from '@/lib/ai-models';

const AI = () => {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isLoading, sendMessage } = useAIChat();
  const {
    sessions,
    currentSessionId,
    messages,
    loading: sessionsLoading,
    setCurrentSessionId,
    createSession,
    renameSession,
    deleteSession,
    addMessage,
    updateLastAssistantMessage,
    saveAssistantMessage,
  } = useAIChatSessions();
  const { preferences, updatePreferences } = useAIPreferences();
  const { plan } = useSubscription();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const subscriptionPlan: SubscriptionPlan = (plan as SubscriptionPlan) || 'free';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');

    // Create session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createSession();
      if (!sessionId) return;
    }

    // Add user message
    await addMessage('user', userInput);

    let assistantContent = '';
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      updateLastAssistantMessage(assistantContent);
    };

    try {
      const messagesForAI = [
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: userInput }
      ];

      await sendMessage(messagesForAI, upsertAssistant, () => {});
      await saveAssistantMessage(assistantContent);
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

  const handleModelChange = (modelId: string) => {
    updatePreferences({ selected_model: modelId });
  };

  const handleModeChange = (mode: 'cloud' | 'local') => {
    updatePreferences({ execution_mode: mode });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 left-2 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "absolute md:relative z-40 h-full transition-transform duration-200 md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <AIChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onCreateSession={createSession}
          onRenameSession={renameSession}
          onDeleteSession={deleteSession}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-gradient-to-r from-primary/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 ml-10 md:ml-0">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Aura AI</h1>
            </div>
            <div className="flex items-center gap-2">
              <AIModelSelector
                selectedModel={preferences?.selected_model || 'gemini-2.5-flash'}
                executionMode={(preferences?.execution_mode as 'cloud' | 'local') || 'cloud'}
                subscriptionPlan={subscriptionPlan}
                onModelChange={handleModelChange}
                onModeChange={handleModeChange}
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/ai-settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-10 md:ml-0">
            Your intelligent assistant powered by advanced AI
          </p>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {!currentSessionId || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <Bot className="h-24 w-24 text-primary relative" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Start a New Conversation</h2>
                <p className="text-muted-foreground">
                  Ask me anything! I can help with tasks, answer questions, provide suggestions, and more.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-4">
                <Card
                  className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setInput("Help me plan a team meeting")}
                >
                  <p className="text-sm font-medium">Plan a meeting</p>
                  <p className="text-xs text-muted-foreground">Get help organizing your next team sync</p>
                </Card>
                <Card
                  className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setInput("Suggest improvements for team collaboration")}
                >
                  <p className="text-sm font-medium">Improve collaboration</p>
                  <p className="text-xs text-muted-foreground">Get suggestions for better teamwork</p>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto pb-4">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
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
                    {message.content.includes('![Generated Image]') ? (
                      <div className="space-y-2">
                        {message.content.split('\n\n').map((part, i) => {
                          const imgMatch = part.match(/!\[Generated Image\]\((.*?)\)/);
                          if (imgMatch) {
                            return (
                              <img 
                                key={i}
                                src={imgMatch[1]} 
                                alt="Generated" 
                                className="rounded-lg max-w-full h-auto"
                              />
                            );
                          }
                          return part ? <p key={i} className="text-sm whitespace-pre-wrap break-words">{part}</p> : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-accent">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
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

        {/* Input area */}
        <div className="border-t p-4 bg-card/50 backdrop-blur">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Aura anything..."
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
            Powered by Aura AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default AI;
