import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { MessageArea } from '@/components/chat/MessageArea';
import { AddFriendDialog } from '@/components/chat/AddFriendDialog';
import { CreateGroupDialog } from '@/components/chat/CreateGroupDialog';
import { FriendsList } from '@/components/chat/FriendsList';
import { MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Chat = () => {
  const { conversations, loading: convoLoading, refetch } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { messages, sendMessage, loading: messagesLoading } = useMessages(selectedConversationId);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const getConversationName = () => {
    if (!selectedConversation) return 'Select a conversation';
    if (selectedConversation.is_group) {
      return selectedConversation.name || 'Unnamed Group';
    }
    const otherMember = selectedConversation.members?.find((m: any) => m.user_id !== selectedConversationId);
    return otherMember?.profiles?.full_name || otherMember?.profiles?.email || 'Private Chat';
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-80 flex flex-col bg-card/30 backdrop-blur-sm md:flex hidden border-r border-border/40">
        {/* Sidebar Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Messages</h2>
          </div>
          <div className="flex items-center gap-1">
            <AddFriendDialog />
            <CreateGroupDialog onGroupCreated={refetch} />
          </div>
        </div>
        
        {/* Friends List */}
        <div className="flex-1 overflow-hidden">
          <FriendsList
            onSelectConversation={setSelectedConversationId}
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
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <AddFriendDialog />
                <CreateGroupDialog onGroupCreated={refetch} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
