import { useState, useEffect } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/contexts/AuthContext';
import { MessageArea } from '@/components/chat/MessageArea';
import { AddFriendDialog } from '@/components/chat/AddFriendDialog';
import { FriendsList } from '@/components/chat/FriendsList';
import { MessageSquare, ArrowLeft, Users, Phone, Video, MoreVertical, Palette } from 'lucide-react';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { getPresenceLabel } from '@/components/PresenceIndicator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '@/contexts/CallContext';
import { ChatOptionsMenu } from '@/components/chat/ChatOptionsMenu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WallpaperPicker, getWallpaper, type WallpaperId } from '@/components/chat/ChatWallpaper';

const Chat = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, loading: convoLoading, refetch } = useConversations();
  const { getUnreadCount, markAsRead } = useUnreadMessages();
  const { getStatus } = usePresenceContext();
  const { startCall } = useCall();
  
  const initialConversation = searchParams.get('conversation');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversation);
  const { messages, sendMessage, loading: messagesLoading, refetch: refetchMessages } = useMessages(selectedConversationId);

  // Handle URL param changes
  useEffect(() => {
    const conversationFromUrl = searchParams.get('conversation');
    if (conversationFromUrl && conversationFromUrl !== selectedConversationId) {
      setSelectedConversationId(conversationFromUrl);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, selectedConversationId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

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
    markAsRead(id);
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
  };

  // Mobile layout - use absolute positioning to fill the entire main area
  if (isMobile) {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-background">
        <AnimatePresence mode="wait" initial={false}>
          {selectedConversationId ? (
            <motion.div
              key="chat-view"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="h-14 px-2 flex items-center gap-2 border-b border-border/30 bg-card/80 backdrop-blur-xl shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="h-9 w-9 rounded-xl touch-feedback shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                    {selectedConversation?.is_group ? (
                      <Users className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <span className="text-sm font-bold text-primary-foreground">
                        {getConversationName().slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {getConversationName()}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {selectedConversation?.is_group ? (
                        <p className="text-xs text-muted-foreground">Group</p>
                      ) : (
                        <>
                          <PresenceIndicator status={getStatus(getOtherUserId() || '')} size="sm" />
                          <p className="text-xs text-muted-foreground">
                            {getPresenceLabel(getStatus(getOtherUserId() || ''))}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Call & Options buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Wallpaper picker */}
                  {selectedConversationId && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground">
                          <Palette className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto" align="end">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Chat Wallpaper</p>
                        <WallpaperPicker
                          conversationId={selectedConversationId}
                          currentWallpaper={getWallpaper(selectedConversationId)}
                          onSelect={() => {}}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-muted-foreground"
                    onClick={() => selectedConversationId && startCall(selectedConversationId, getConversationName(), false)}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-muted-foreground"
                    onClick={() => selectedConversationId && startCall(selectedConversationId, getConversationName(), true)}
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  {!selectedConversation?.is_group && getOtherUserId() && (
                    <ChatOptionsMenu targetUserId={getOtherUserId()!} targetUserName={getConversationName()}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </ChatOptionsMenu>
                  )}
                </div>
              </div>
              {/* Message area fills remaining space */}
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
            <motion.div
              key="list-view"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="h-14 px-4 flex items-center justify-between border-b border-border/30 bg-card/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold">Chats</h2>
                </div>
                <AddFriendDialog />
              </div>
              <div className="flex-1 overflow-auto">
                <FriendsList
                  onSelectConversation={handleSelectConversation}
                  selectedConversationId={selectedConversationId}
                  conversations={conversations}
                  getUnreadCount={getUnreadCount}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex flex-col bg-card/30 backdrop-blur-sm border-r border-border/40">
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Messages</h2>
          </div>
          <AddFriendDialog />
        </div>
        <div className="flex-1 overflow-hidden">
          <FriendsList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
            conversations={conversations}
            getUnreadCount={getUnreadCount}
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
