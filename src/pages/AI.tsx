import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat } from '@/hooks/useAIChat';
import { useAIChatSessions } from '@/hooks/useAIChatSessions';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { useSubscription } from '@/hooks/useSubscription';
import { AIChatSidebar } from '@/components/ai/AIChatSidebar';
import { Loader2, Send, User, Menu, X, Settings, Sparkles, Zap, Lightbulb, MessageCircle, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionPlan } from '@/lib/ai-models';
import { motion, AnimatePresence } from 'framer-motion';

const AI = () => {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default on mobile
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
    updateSessionModel,
  } = useAIChatSessions();
  const { preferences, updatePreferences } = useAIPreferences();
  const { plan } = useSubscription();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close sidebar when selecting a session on mobile
  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Close sidebar after creating a session on mobile
  const handleCreateSession = async () => {
    await createSession();
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

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

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createSession();
      if (!sessionId) return;
    }

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
    if (currentSessionId) {
      updateSessionModel(currentSessionId, modelId);
    }
  };

  const handleModeChange = (mode: 'cloud' | 'local') => {
    updatePreferences({ execution_mode: mode });
  };

  const suggestionCards = [
    {
      icon: Lightbulb,
      title: "Brainstorm ideas",
      description: "Help me think through a problem",
      prompt: "Help me brainstorm creative solutions for improving team productivity"
    },
    {
      icon: MessageCircle,
      title: "Plan a meeting",
      description: "Organize your next team sync",
      prompt: "Help me plan an effective team meeting agenda"
    },
    {
      icon: Zap,
      title: "Quick summary",
      description: "Summarize complex topics",
      prompt: "Explain the key benefits of AI-powered collaboration tools"
    },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background relative overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:relative z-40 h-full transition-transform duration-200 ease-out md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <AIChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onRenameSession={renameSession}
          onDeleteSession={deleteSession}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-background/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="px-3 md:px-4 py-3 flex items-center justify-between gap-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold tracking-tight">Aura</h1>
                <p className="text-xs text-muted-foreground">AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {/* Placeholder for AIModelSelector - will be re-added */}
              <Button variant="outline" className="gap-2 h-9" disabled={isLoading}>
                <Sparkles className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{preferences?.selected_model || 'Gemini Flash'}</span>
                <Cloud className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9 shrink-0"
                onClick={() => navigate('/ai-settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-6">
            <AnimatePresence mode="wait">
              {!currentSessionId || messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                >
                  {/* Hero icon */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 blur-3xl scale-150 opacity-50" />
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-purple-600 flex items-center justify-center shadow-2xl shadow-primary/30"
                    >
                      <Sparkles className="h-10 w-10 text-primary-foreground" />
                    </motion.div>
                  </div>
                  
                  <h2 className="text-xl md:text-2xl font-semibold mb-2">How can I help you today?</h2>
                  <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-md px-4">
                    I'm Aura, your AI assistant. Ask me anything or choose a suggestion below.
                  </p>
                  
                  {/* Suggestion cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 w-full max-w-2xl px-2">
                    {suggestionCards.map((card, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setInput(card.prompt)}
                        className="group p-3 md:p-4 rounded-xl border bg-card/50 hover:bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left"
                      >
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2 md:mb-3 group-hover:bg-primary/20 transition-colors">
                          <card.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                        </div>
                        <p className="font-medium text-sm mb-0.5 md:mb-1">{card.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6 pb-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-md shadow-primary/20">
                          <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <div className={cn(
                        "rounded-2xl px-4 py-3 max-w-[85%] shadow-sm",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted/80 rounded-bl-md'
                      )}>
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
                              return part ? <p key={i} className="text-sm whitespace-pre-wrap break-words leading-relaxed">{part}</p> : null;
                            })}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                        )}
                        <p className={cn(
                          "text-[10px] mt-2 opacity-60",
                          message.role === 'user' ? 'text-right' : 'text-left'
                        )}>
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent shadow-sm">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 justify-start"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-md shadow-primary/20">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/80">
                        <div className="flex items-center gap-1.5">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            className="h-2 w-2 rounded-full bg-primary/60"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            className="h-2 w-2 rounded-full bg-primary/60"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            className="h-2 w-2 rounded-full bg-primary/60"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="bg-background/80 backdrop-blur-xl p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message Aura..."
                  disabled={isLoading}
                  className="pr-11 md:pr-12 py-5 md:py-6 rounded-xl bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary/50 text-sm md:text-base"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 md:h-8 md:w-8 rounded-lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2 hidden sm:block">
              Aura can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AI;