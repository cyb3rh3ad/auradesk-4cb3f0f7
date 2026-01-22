import { useState, useEffect, useCallback, useMemo } from 'react';
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

const Chat = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, loading: convoLoading, refetch } = useConversations();
  
  // Initialize from URL param immediately
  const initialConversation = searchParams.get('conversation');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversation);
  const { messages, sendMessage, loading: messagesLoading, refetch: refetchMessages } = useMessages(selectedConversationId);

  const handleRefresh = useCallback(async () => {
    await refetch();
    if (selectedConversationId) {
      await refetchMessages();
    }
  }, [refetch, selectedConversationId, refetchMessages]);

  // Handle URL param changes (for navigation from other pages)
  useEffect(() => {
    const conversationFromUrl = searchParams.get('conversation');
    if (conversationFromUrl && conversationFromUrl !== selectedConversationId) {
      setSelectedConversationId(conversationFromUrl);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, selectedConversationId]);

  const selectedConversation = useMemo(() => 
    conversations.find((c) => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  // Get the other user's ID for direct messages - memoized
  const otherUserId = useMemo(() => {
    if (!selectedConversation || selectedConversation.is_group) return null;
    const otherMember = selectedConversation.members?.find((m: any) => m.user_id !== user?.id);
    return otherMember?.user_id || null;
  }, [selectedConversation, user?.id]);

  const conversationName = useMemo(() => {
    if (!selectedConversation) return 'Select a conversation';
    if (selectedConversation.is_group) {
      return selectedConversation.name || 'Unnamed Group';
    }
    const otherMember = selectedConversation.members?.find((m: any) => m.user_id !== user?.id);
    return otherMember?.profiles?.full_name || otherMember?.profiles?.email || 'Private Chat';
  }, [selectedConversation, user?.id]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  // Mobile: Show either friends list or chat, not both - Discord/Snap style
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden bg-background">
          {selectedConversationId ? (
            // Mobile Chat View - Full screen messaging
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chat Header - Compact like Snap/Discord */}
              <div className="h-14 px-2 flex items-center gap-2 border-b border-border/40 bg-card/50 backdrop-blur-sm shrink-0 safe-area-pt">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="h-10 w-10 touch-manipulation shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                    {selectedConversation?.is_group ? (
                      <Users className="w-5 h-5 text-primary-foreground" />
                    ) : (
                      <span className="text-sm font-bold text-primary-foreground">
                        {conversationName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{conversationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation?.is_group ? 'Group' : 'Active now'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <MessageArea
                  messages={messages}
                  onSendMessage={sendMessage}
                  conversationName={conversationName}
                  isGroup={selectedConversation?.is_group || false}
                  conversationId={selectedConversationId}
                  otherUserId={otherUserId}
                />
              </div>
            </div>
          ) : (
            // Mobile Friends List View - Clean like Discord/Snap
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-14 px-4 flex items-center justify-between border-b border-border/40 bg-card/50 backdrop-blur-sm shrink-0 safe-area-pt">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold">Chats</h2>
                </div>
                <AddFriendDialog />
              </div>
              <div className="flex-1 overflow-hidden">
                <FriendsList
                  onSelectConversation={handleSelectConversation}
                  selectedConversationId={selectedConversationId}
                  conversations={conversations}
                />
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>
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
            conversationName={conversationName}
            isGroup={selectedConversation?.is_group || false}
            conversationId={selectedConversationId}
            otherUserId={otherUserId}
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
