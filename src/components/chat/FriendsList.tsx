import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

interface Friend {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  avatar_url: string | null;
  conversation_id?: string;
}

interface FriendsListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId: string | null;
}

export const FriendsList = ({ onSelectConversation, selectedConversationId }: FriendsListProps) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

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
      if (!profiles) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url')
        .in('id', friendIds);

      if (profileError || !profiles) {
        setFriends([]);
        setLoading(false);
        return;
      }
      // VVVV The new optimized logic must follow VVVV

// 3. Get all private conversations between you and ALL your friends in one query.
const { data: allConvoMembers, error: convoError } = await supabase
  .from('conversation_members')
  .select(`
    conversation_id,
    user_id,
    conversations!inner(is_group)
  `)
  .in('user_id', [...friendIds, user.id]) // Get all records involving you or a friend
  .eq('conversations.is_group', false); // Only private chats

if (convoError || !allConvoMembers) {
  // If there's an error fetching conversations, continue without conversation IDs
  console.error("Error fetching conversations:", convoError);
}

// Map conversation IDs to friend IDs for quick lookup
const friendConvoMap = new Map<string, string>(); // Key: Friend ID, Value: Conversation ID

if (allConvoMembers) {
  // Group members by conversation ID
  const convosByFriend: { [key: string]: string[] } = {};
  for (const member of allConvoMembers) {
    if (!convosByFriend[member.conversation_id]) {
      convosByFriend[member.conversation_id] = [];
    }
    convosByFriend[member.conversation_id].push(member.user_id);
  }

  // Identify 1:1 chats with friends
  for (const [convoId, members] of Object.entries(convosByFriend)) {
    if (members.length === 2 && members.includes(user.id)) {
      // Find the friend's ID in this 1:1 chat
      const friendIdInConvo = members.find(id => id !== user.id);
      if (friendIdInConvo) {
        friendConvoMap.set(friendIdInConvo, convoId);
      }
    }
  }
}

// 4. Combine profiles with the conversation ID from the map (no looping queries!)
const friendsWithConvos = profiles.map(profile => ({
  ...profile,
  conversation_id: friendConvoMap.get(profile.id),
})) as Friend[];

setFriends(friendsWithConvos);
setLoading(false);

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

    // Create a new conversation if one doesn't exist
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: authUser.id })
      .select()
      .single();

    if (error || !conversation) return;

    // Add both users as members
    await supabase.from('conversation_members').insert({ 
      conversation_id: conversation.id, 
      user_id: authUser.id 
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

  if (loading) {
    return (
      <div className="p-3">
        <div className="text-xs font-semibold text-muted-foreground mb-2">Friends</div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-muted" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="p-3">
        <div className="text-xs font-semibold text-muted-foreground mb-2">Friends</div>
        <p className="text-xs text-muted-foreground/70">No friends yet. Add some friends to start chatting!</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="text-xs font-semibold text-muted-foreground mb-2">Friends ({friends.length})</div>
      <ScrollArea className="max-h-48">
        <div className="space-y-1">
          {friends.map((friend) => {
            const isSelected = friend.conversation_id === selectedConversationId;
            return (
              <button
                key={friend.id}
                onClick={() => handleFriendClick(friend)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200',
                  'hover:bg-accent/10 group',
                  isSelected && 'bg-accent/20'
                )}
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={friend.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-accent/20">
                    {getInitials(friend)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">
                    {friend.full_name || friend.username || friend.email}
                  </p>
                  {friend.username && friend.full_name && (
                    <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                  )}
                </div>
                <MessageCircle className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

