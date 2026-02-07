import { useState, useEffect } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { MessageArea } from '@/components/chat/MessageArea';
import { AddFriendDialog } from '@/components/chat/AddFriendDialog';
import { FriendsList } from '@/components/chat/FriendsList';
import { MessageSquare, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, loading: convoLoading, refetch } = useConversations();
  
  // Initialize from URL param immediately
  const initialConversation = searchParams.get('conversation');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversation);
  const { messages, sendMessage, loading: messagesLoading, refetch: refetchMessages } = useMessages(selectedConversationId);

  const handleRefresh = async () => {
    await refetch();
    if (selectedConversationId) {
      await refetchMessages();
    }
  };

  // Handle URL param changes (for navigation from other pages)
  useEffect(() => {
    const conversationFromUrl = searchParams.get('conversation');
    if (conversationFromUrl && conversationFromUrl !== selectedConversationId) {
      setSelectedConversationId(conversationFromUrl);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, selectedConversationId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // Get the other user's ID for direct messages
  const getOtherUserId = () => {
    if (!selectedConversation || selectedConversation.is_group) return null;
    const otherMember = selectedConversation.members?.find((m: any) => m.user_id !== user?.id);
    return otherMember?.user_id || null;
  };

  const getConversationName = () => {
    if (!selectedConversation) return 'Select a conversation';
    if (selectedConversation.is_group) {
      return selectedConversation.name || 'Unnamed Group';
    }
    const otherMember = selectedConversation.members?.find((m: any) => m.user_id !== user?.id);
    return otherMember?.profiles?.full_name || otherMember?.profiles?.email || 'Private Chat';
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
  };

  // Mobile: Show either friends list or chat, not both - Discord/Snap style
  // CRITICAL: This page manages its own layout - AppLayout sets overflow-hidden on main
  // We use h-full to fill the available space from the parent flex container
  if (isMobile) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-background">
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {selectedConversationId ? (
              // Mobile Chat View - Full screen messaging with slide animation
              <motion.div
                key="chat-view"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                {/* Chat Header - Premium glassmorphism style */}
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="h-14 px-2 flex items-center gap-2 border-b border-border/30 bg-card/80 backdrop-blur-xl shrink-0 safe-area-pt"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToList}
                    className="h-9 w-9 rounded-xl touch-feedback shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <motion.div 
                    className="flex items-center gap-3 flex-1 min-w-0"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <motion.div 
                      layoutId={`avatar-${selectedConversationId}`}
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg shadow-primary/20"
                    >
                      {selectedConversation?.is_group ? (
                        <Users className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <span className="text-sm font-bold text-primary-foreground">
                          {getConversationName().slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <motion.p 
                        layoutId={`name-${selectedConversationId}`}
                        className="font-semibold text-sm truncate"
                      >
                        {getConversationName()}
                      </motion.p>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation?.is_group ? 'Group' : 'Active now'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <MessageArea
                    messages={messages}
                    onSendMessage={sendMessage}
                    conversationName={getConversationName()}
                    isGroup={selectedConversation?.is_group || false}
                    conversationId={selectedConversationId}
                    otherUserId={getOtherUserId()}
                  />
                </div>
              </motion.div>
            ) : (
              // Mobile Friends List View - Clean like Discord/Snap with slide animation
              <motion.div
                key="list-view"
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="h-14 px-4 flex items-center justify-between border-b border-border/30 bg-card/80 backdrop-blur-xl shrink-0 safe-area-pt"
                >
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </motion.div>
                    <h2 className="text-lg font-bold">Chats</h2>
                  </div>
                  <AddFriendDialog />
                </motion.div>
                <div className="flex-1 overflow-hidden">
                  <FriendsList
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={selectedConversationId}
                    conversations={conversations}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PullToRefresh>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex flex-col bg-card/30 backdrop-blur-sm border-r border-border/40">
        {/* Sidebar Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Messages</h2>
          </div>
          <AddFriendDialog />
        </div>
        
        {/* Friends List */}
        <div className="flex-1 overflow-hidden">
          <FriendsList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
            conversations={conversations}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversationId ? (
          <MessageArea
            messages={messages}
            onSendMessage={sendMessage}
            conversationName={getConversationName()}
            isGroup={selectedConversation?.is_group || false}
            conversationId={selectedConversationId}
            otherUserId={getOtherUserId()}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
            <div className="text-center space-y-6 max-w-md px-6">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-12 h-12 text-primary/70" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Welcome to Messages</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select a conversation from the sidebar to start chatting, or add a new friend to begin a conversation.
                </p>
              </div>
              <AddFriendDialog />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
