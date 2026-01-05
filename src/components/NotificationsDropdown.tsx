import { useState, useEffect } from 'react';
import { UserPlus, Headphones, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDismissedHelpRequests } from '@/hooks/useDismissedHelpRequests';
import { formatDistanceToNow } from 'date-fns';
import { AnimatedBellIcon } from '@/components/icons/AnimatedIcons';

interface FriendRequest {
  id: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    email: string;
  };
}

interface HelpRequest {
  id: string;
  requester_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
  };
}

export const NotificationsDropdown = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { dismissRequest, filterDismissed, isLoaded } = useDismissedHelpRequests(user?.id);

  // Filter help requests to exclude dismissed ones (only after loaded)
  const visibleHelpRequests = isLoaded ? filterDismissed(helpRequests) : [];
  const totalNotifications = friendRequests.length + visibleHelpRequests.length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      // Fetch pending friend requests where user is the receiver
      const { data: friendData, error: friendError } = await supabase
        .from('friendships')
        .select('id, user_id, created_at')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (friendError) {
        console.error('Error fetching friend requests:', friendError);
      }

      if (friendData && friendData.length > 0) {
        // Fetch profile data for the senders
        const senderIds = friendData.map(f => f.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, username, email')
          .in('id', senderIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedRequests = friendData.map(req => ({
          ...req,
          profiles: profilesMap.get(req.user_id) || null
        }));
        
        setFriendRequests(enrichedRequests as any);
      } else {
        setFriendRequests([]);
      }

      // Fetch pending help requests
      const { data: helpData, error: helpError } = await supabase
        .from('help_requests')
        .select('id, requester_id, title, description, status, created_at')
        .eq('status', 'pending')
        .neq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (helpError) {
        console.error('Error fetching help requests:', helpError);
      }

      if (helpData && helpData.length > 0) {
        // Fetch profile data for requesters
        const requesterIds = helpData.map(h => h.requester_id);
        const { data: requesterProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', requesterIds);

        const requesterMap = new Map(requesterProfiles?.map(p => [p.id, p]) || []);
        
        const enrichedHelp = helpData.map(req => ({
          ...req,
          profiles: requesterMap.get(req.requester_id) || null
        }));
        
        setHelpRequests(enrichedHelp as any);
      } else {
        setHelpRequests([]);
      }
    };

    fetchNotifications();

    // Subscribe to friend requests
    const friendChannel = supabase
      .channel('friend-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${user.id}`,
        },
        () => fetchNotifications()
      )
      .subscribe();

    // Subscribe to help requests
    const helpChannel = supabase
      .channel('help-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests',
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendChannel);
      supabase.removeChannel(helpChannel);
    };
  }, [user]);

  const handleAcceptFriend = async (requestId: string) => {
    setLoading(true);
    
    // Get the current authenticated user directly from Supabase
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    
    // Get the friend request to find the sender's user_id
    const request = friendRequests.find(r => r.id === requestId);
    if (!request) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept friend request',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Create a private conversation between the two users
    const { data: conversation, error: convoError } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: authUser.id })
      .select()
      .single();

    if (convoError) {
      console.error('Error creating conversation:', convoError);
      toast({
        title: 'Friend added',
        description: 'Friend request accepted but could not create chat.',
        variant: 'destructive',
      });
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      setLoading(false);
      return;
    }

    // Add current user as member first (RLS allows creator to add members)
    const { error: memberError1 } = await supabase
      .from('conversation_members')
      .insert({ conversation_id: conversation.id, user_id: authUser.id });

    if (memberError1) {
      console.error('Error adding self to conversation:', memberError1);
    }

    // Add friend as member
    const { error: memberError2 } = await supabase
      .from('conversation_members')
      .insert({ conversation_id: conversation.id, user_id: request.user_id });

    if (memberError2) {
      console.error('Error adding friend to conversation:', memberError2);
    }

    toast({
      title: 'Friend request accepted!',
      description: 'You are now friends and can start chatting.',
    });
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    setLoading(false);
  };

  const handleDeclineFriend = async (requestId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (!error) {
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setLoading(false);
  };

  const handleAcceptHelp = async (requestId: string) => {
    if (!user) return;
    setLoading(true);

    const connectionCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { error } = await supabase
      .from('help_requests')
      .update({
        status: 'accepted',
        helper_id: user.id,
        connection_code: connectionCode,
      })
      .eq('id', requestId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept help request',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Help Request Accepted',
        description: `Connection code: ${connectionCode}`,
      });
      setHelpRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setLoading(false);
  };

  const handleDismissHelp = (requestId: string) => {
    dismissRequest(requestId);
    setHelpRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/10 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md"
        >
          <AnimatedBellIcon className="w-5 h-5" />
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {totalNotifications === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No new notifications
            </div>
          ) : (
            <>
              {friendRequests.map((request) => (
                <div key={request.id} className="p-3 border-b border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <UserPlus className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Friend Request</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.profiles?.full_name || request.profiles?.username || request.profiles?.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAcceptFriend(request.id)}
                          disabled={loading}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleDeclineFriend(request.id)}
                          disabled={loading}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {visibleHelpRequests.map((request) => (
                <div key={request.id} className="p-3 border-b border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-orange-500/10">
                      <Headphones className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{request.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {request.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        From: {request.profiles?.full_name || request.profiles?.username || 'Unknown'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAcceptHelp(request.id)}
                          disabled={loading}
                        >
                          Connect & Help
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleDismissHelp(request.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};