import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { ConversationsList } from '@/components/chat/ConversationsList';
import { MessageArea } from '@/components/chat/MessageArea';
import { AddFriendDialog } from '@/components/chat/AddFriendDialog';
import { CreateGroupDialog } from '@/components/chat/CreateGroupDialog';
import { MessageSquare } from 'lucide-react';

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
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-full md:w-80 flex flex-col bg-card/30 backdrop-blur-sm md:block hidden">
        <div className="h-16 border-b border-border/50 px-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <div className="flex gap-2">
            <AddFriendDialog />
            <CreateGroupDialog onGroupCreated={refetch} />
          </div>
        </div>
        
        {convoLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-2">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Add friends or create groups to start chatting</p>
            </div>
          </div>
        ) : (
          <ConversationsList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        )}
      </div>

      {/* Main Chat Area with border */}
      <div className="flex-1 flex flex-col border-l border-border/50">
        {selectedConversationId ? (
          <MessageArea
            messages={messages}
            onSendMessage={sendMessage}
            conversationName={getConversationName()}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/30" />
              <h3 className="text-xl font-semibold">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
