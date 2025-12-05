import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import { Conversation } from '@/hooks/useConversations';

interface Friend {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  avatar_url: string | null;
  conversation_id?: string;
  hasUnread?: boolean;
  lastMessage?: string;
}

interface FriendsListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
  conversations: Conversation[];
}

export const FriendsList = ({ onSelectConversation, selectedConversationId, conversations }: FriendsListProps) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [readConversations, setReadConversations] = useState<Set<string>>(new Set());

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId) {
      setReadConversations(prev => new Set([...prev, selectedConversationId]));
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      // Get accepted friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get friend IDs (the other person in each friendship)
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Get profiles for friends
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url')
        .in('id', friendIds);

      if (profileError || !profiles) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get all private conversations between you and ALL your friends in one query
      const { data: allConvoMembers, error: convoError } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          user_id,
          conversations!inner(is_group)
        `)
        .in('user_id', [...friendIds, user.id])
        .eq('conversations.is_group', false);

      if (convoError) {
        console.error("Error fetching conversations:", convoError);
      }

      // Map conversation IDs to friend IDs for quick lookup
      const friendConvoMap = new Map<string, string>();

      if (allConvoMembers) {
        const convosByFriend: { [key: string]: string[] } = {};
        for (const member of allConvoMembers) {
          if (!convosByFriend[member.conversation_id]) {
            convosByFriend[member.conversation_id] = [];
          }
          convosByFriend[member.conversation_id].push(member.user_id);
        }

        for (const [convoId, members] of Object.entries(convosByFriend)) {
          if (members.length === 2 && members.includes(user.id)) {
            const friendIdInConvo = members.find(id => id !== user.id);
            if (friendIdInConvo) {
              friendConvoMap.set(friendIdInConvo, convoId);
            }
          }
        }
      }

      const friendsWithConvos = profiles.map(profile => ({
        ...profile,
        conversation_id: friendConvoMap.get(profile.id),
      })) as Friend[];

      setFriends(friendsWithConvos);
      setLoading(false);
    };

    fetchFriends();

    // Subscribe to friendship changes
    const channel = supabase
      .channel('friends-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleFriendClick = async (friend: Friend) => {
    if (friend.conversation_id) {
      onSelectConversation(friend.conversation_id);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    // Check if a conversation already exists between these two users
    const { data: existingConvos } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', authData.user.id);

    if (existingConvos) {
      for (const convo of existingConvos) {
        const { data: members } = await supabase
          .from('conversation_members')
          .select('user_id, conversations!inner(is_group)')
          .eq('conversation_id', convo.conversation_id)
          .eq('conversations.is_group', false);

        if (members && members.length === 2) {
          const hasFriend = members.some(m => m.user_id === friend.id);
          const hasMe = members.some(m => m.user_id === authData.user.id);
          if (hasFriend && hasMe) {
            onSelectConversation(convo.conversation_id);
            return;
          }
        }
      }
    }

    // Create new conversation if none exists
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: authData.user.id })
      .select()
      .single();

    if (error || !conversation) {
      console.error('Error creating conversation:', error);
      return;
    }

    // Add both users as members
    await supabase.from('conversation_members').insert({ 
      conversation_id: conversation.id, 
      user_id: authData.user.id 
    });
    await supabase.from('conversation_members').insert({ 
      conversation_id: conversation.id, 
      user_id: friend.id 
    });

    onSelectConversation(conversation.id);
  };

  const getInitials = (friend: Friend) => {
    if (friend.full_name) {
      return friend.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (friend.username) {
      return friend.username.slice(0, 2).toUpperCase();
    }
    return friend.email.slice(0, 2).toUpperCase();
  };

  // Check if friend has unread messages
  const hasUnreadMessages = (friend: Friend) => {
    if (!friend.conversation_id) return false;
    // If conversation hasn't been opened in this session, check if there are any messages
    if (!readConversations.has(friend.conversation_id)) {
      const convo = conversations.find(c => c.id === friend.conversation_id);
      // Has messages and not yet read in this session
      return !!convo;
    }
    return false;
  };

  // Get group conversations
  const groupConversations = conversations.filter(c => c.is_group);

  if (loading) {
    return (
      <div className="p-3">
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse px-2 py-2">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="py-2">
        {/* Friends Section */}
        {friends.length > 0 && (
          <div className="space-y-0.5">
            {friends.map((friend) => {
              const isSelected = friend.conversation_id === selectedConversationId;
              const unread = hasUnreadMessages(friend);
              
              return (
                <button
                  key={friend.id}
                  onClick={() => handleFriendClick(friend)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-all duration-150',
                    'hover:bg-accent/50',
                    isSelected && 'bg-accent'
                  )}
                  style={{ width: 'calc(100% - 16px)' }}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        {getInitials(friend)}
                      </AvatarFallback>
                    </Avatar>
                    {unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                    )}>
                      {friend.full_name || friend.username || friend.email}
                    </p>
                    {friend.username && friend.full_name && (
                      <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Groups Section */}
        {groupConversations.length > 0 && (
          <>
            <div className="px-4 pt-4 pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups</span>
            </div>
            <div className="space-y-0.5">
              {groupConversations.map((group) => {
                const isSelected = group.id === selectedConversationId;
                const unread = !readConversations.has(group.id);
                
                return (
                  <button
                    key={group.id}
                    onClick={() => onSelectConversation(group.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-all duration-150',
                      'hover:bg-accent/50',
                      isSelected && 'bg-accent'
                    )}
                    style={{ width: 'calc(100% - 16px)' }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      {unread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={cn(
                        'text-sm truncate',
                        unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                      )}>
                        {group.name || 'Unnamed Group'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.members?.length || 0} members
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {friends.length === 0 && groupConversations.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No friends yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add friends to start chatting!</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
