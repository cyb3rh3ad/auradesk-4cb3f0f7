import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { MessageArea } from '@/components/chat/MessageArea';
import { AddFriendDialog } from '@/components/chat/AddFriendDialog';
import { CreateGroupDialog } from '@/components/chat/CreateGroupDialog';
import { FriendsList } from '@/components/chat/FriendsList';
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
        <div className="h-14 border-b border-border/50 px-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground shrink-0">Direct Messages</h2>
          <div className="flex gap-1 ml-auto">
            <AddFriendDialog />
            <CreateGroupDialog onGroupCreated={refetch} />
          </div>
        </div>
        
        {/* Friends List - Now the main navigation */}
        <div className="flex-1 border-r border-border/50">
          <FriendsList
            onSelectConversation={setSelectedConversationId}
            selectedConversationId={selectedConversationId}
            conversations={conversations}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <MessageArea
            messages={messages}
            onSendMessage={sendMessage}
            conversationName={getConversationName()}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No conversation selected</h3>
                <p className="text-sm text-muted-foreground mt-1">Click on a friend to start chatting</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
