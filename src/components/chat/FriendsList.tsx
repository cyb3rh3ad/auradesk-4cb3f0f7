import { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import { Conversation } from '@/hooks/useConversations';
import { triggerHaptic } from '@/utils/haptics';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { ChatSearchBar } from './ChatSearchBar';

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
  conversations: Conversation[];
  getUnreadCount?: (conversationId: string) => number;
}

export const FriendsList = ({ onSelectConversation, selectedConversationId, conversations, getUnreadCount }: FriendsListProps) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { getStatus } = usePresenceContext();

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
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

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url')
        .in('id', friendIds);

      if (profileError || !profiles) {
        setFriends([]);
        setLoading(false);
        return;
      }

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

    const channel = supabase
      .channel('friends-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
      }, () => fetchFriends())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleFriendClick = async (friend: Friend) => {
    triggerHaptic('light');
    
    if (friend.conversation_id) {
      onSelectConversation(friend.conversation_id);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

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

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: authData.user.id })
      .select()
      .single();

    if (error || !conversation) {
      console.error('Error creating conversation:', error);
      return;
    }

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

  const groupConversations = conversations.filter(c => c.is_group);

  // Filter friends and groups by search query
  const query = searchQuery.toLowerCase().trim();
  const filteredFriends = useMemo(() => {
    if (!query) return friends;
    return friends.filter(f => 
      (f.full_name?.toLowerCase().includes(query)) ||
      (f.username?.toLowerCase().includes(query)) ||
      f.email.toLowerCase().includes(query)
    );
  }, [friends, query]);

  const filteredGroups = useMemo(() => {
    if (!query) return groupConversations;
    return groupConversations.filter(g => 
      g.name?.toLowerCase().includes(query)
    );
  }, [groupConversations, query]);

  if (loading) {
    return (
      <div className="p-3">
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse px-3 py-2.5 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 bg-muted rounded" />
                <div className="h-2.5 w-16 bg-muted/70 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      {/* Search bar */}
      <ChatSearchBar value={searchQuery} onChange={setSearchQuery} />
      <div className="py-2 px-2">
        {/* Friends Section */}
        {filteredFriends.length > 0 && (
          <div className="space-y-1">
            {filteredFriends.map((friend) => {
              const isSelected = friend.conversation_id === selectedConversationId;
              const unreadCount = friend.conversation_id && getUnreadCount 
                ? getUnreadCount(friend.conversation_id) : 0;
              const presenceStatus = getStatus(friend.id);
              
              return (
                <button
                  key={friend.id}
                  onClick={() => handleFriendClick(friend)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 touch-manipulation',
                    'hover:bg-muted/50 active:scale-[0.98]',
                    isSelected && 'bg-primary/10 hover:bg-primary/15'
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-transparent transition-all">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className={cn(
                        "text-sm font-semibold",
                        isSelected 
                          ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {getInitials(friend)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <PresenceIndicator status={presenceStatus} size="md" />
                    </span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={cn(
                      'text-base truncate transition-colors',
                      isSelected ? 'font-semibold text-primary' : 'font-medium text-foreground/90',
                      unreadCount > 0 && 'font-semibold'
                    )}>
                      {friend.full_name || friend.username || friend.email}
                    </p>
                    {friend.username && friend.full_name && (
                      <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Groups Section */}
        {filteredGroups.length > 0 && (
          <>
            <div className="px-3 pt-5 pb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups</span>
            </div>
            <div className="space-y-1">
              {filteredGroups.map((group) => {
                const isSelected = group.id === selectedConversationId;
                const unreadCount = getUnreadCount ? getUnreadCount(group.id) : 0;
                
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onSelectConversation(group.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 touch-manipulation',
                      'hover:bg-muted/50 active:scale-[0.98]',
                      isSelected && 'bg-primary/10 hover:bg-primary/15'
                    )}
                  >
                    <div className="relative">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        isSelected 
                          ? "bg-gradient-to-br from-primary to-accent"
                          : "bg-muted"
                      )}>
                        <Users className={cn(
                          "w-6 h-6",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={cn(
                        'text-base truncate transition-colors',
                        isSelected ? 'font-semibold text-primary' : 'font-medium text-foreground/90',
                        unreadCount > 0 && 'font-semibold'
                      )}>
                        {group.name || 'Unnamed Group'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {group.members?.length || 0} members
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {filteredFriends.length === 0 && filteredGroups.length === 0 && !query && (
          <div className="px-4 py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-base font-medium text-foreground/80">No friends yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add friends to start chatting!</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
