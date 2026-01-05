import { useState, useEffect } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { MessageArea } from '@/components/chat/MessageArea';
import { AddFriendDialog } from '@/components/chat/AddFriendDialog';
import { FriendsList } from '@/components/chat/FriendsList';
import { MessageSquare, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from 'react-router-dom';

const Chat = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, loading: convoLoading, refetch } = useConversations();
  
  // Initialize from URL param immediately
  const initialConversation = searchParams.get('conversation');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversation);
  const { messages, sendMessage, loading: messagesLoading } = useMessages(selectedConversationId);

  // Handle URL param changes (for navigation from other pages)
  useEffect(() => {
    const conversationFromUrl = searchParams.get('conversation');
    if (conversationFromUrl && conversationFromUrl !== selectedConversationId) {
      setSelectedConversationId(conversationFromUrl);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, selectedConversationId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const getConversationName = () => {
    if (!selectedConversation) return 'Select a conversation';
    if (selectedConversation.is_group) {
      return selectedConversation.name || 'Unnamed Group';
    }
    const otherMember = selectedConversation.members?.find((m: any) => m.user_id !== selectedConversationId);
    return otherMember?.profiles?.full_name || otherMember?.profiles?.email || 'Private Chat';
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
  };

  // Mobile: Show either friends list or chat, not both
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {selectedConversationId ? (
          // Mobile Chat View
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-14 px-3 flex items-center gap-3 border-b border-border/40 bg-card/30 backdrop-blur-sm shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToList}
                className="h-9 w-9"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  {selectedConversation?.is_group ? (
                    <Users className="w-4 h-4 text-primary" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-primary" />
                  )}
                </div>
                <span className="font-semibold text-sm truncate">{getConversationName()}</span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <MessageArea
                messages={messages}
                onSendMessage={sendMessage}
                conversationName={getConversationName()}
                isGroup={selectedConversation?.is_group || false}
                conversationId={selectedConversationId}
              />
            </div>
          </div>
        ) : (
          // Mobile Friends List View
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-14 px-4 flex items-center justify-between border-b border-border/40 bg-card/30 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">Messages</h2>
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
