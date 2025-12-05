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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url')
        .in('id', friendIds);

      if (!profiles) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get conversations to find existing chats with friends
      const { data: conversations } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          conversations!inner (id, is_group)
        `)
        .eq('user_id', user.id);

      // For each friend, find if there's a private conversation
      const friendsWithConvos = await Promise.all(
        profiles.map(async (profile) => {
          // Find private conversation with this friend
          let conversationId: string | undefined;
          
          if (conversations) {
            for (const cm of conversations) {
              const convo = cm.conversations as any;
              if (convo && !convo.is_group) {
                // Check if friend is in this conversation
                const { data: members } = await supabase
                  .from('conversation_members')
                  .select('user_id')
                  .eq('conversation_id', cm.conversation_id);

                if (members && members.length === 2) {
                  const hasUser = members.some(m => m.user_id === user.id);
                  const hasFriend = members.some(m => m.user_id === profile.id);
                  if (hasUser && hasFriend) {
                    conversationId = cm.conversation_id;
                    break;
                  }
                }
              }
            }
          }

          return {
            ...profile,
            conversation_id: conversationId,
          };
        })
      );

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
