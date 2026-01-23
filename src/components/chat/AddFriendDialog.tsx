import { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const AddFriendDialog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async () => {
    const searchTerm = email.trim();
    if (!searchTerm) return;
    
    // Require minimum 3 characters
    if (searchTerm.length < 3) {
      toast({
        title: 'Search too short',
        description: 'Please enter at least 3 characters to search.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    // Use secure RPC function that only returns safe fields (no email exposure)
    const { data: profiles, error } = await supabase
      .rpc('search_profiles', { search_query: searchTerm });

    if (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Could not search for users. Please try again.',
        variant: 'destructive',
      });
    }

    setSearchResults(profiles || []);
    setLoading(false);
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user) return;
    setLoading(true);

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    if (existing && existing.length > 0) {
      const friendship = existing[0];
      if (friendship.status === 'accepted') {
        toast({
          title: 'Already friends',
          description: 'You are already friends with this user.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Request pending',
          description: 'A friend request is already pending with this user.',
          variant: 'destructive',
        });
      }
      setLoading(false);
      return;
    }

    // Create friend request
    const { error } = await supabase.from('friendships').insert([
      { user_id: user.id, friend_id: friendId, status: 'pending' },
    ]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send friend request.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Friend request sent!',
        description: 'Your friend request has been sent.',
      });
      setOpen(false);
      setEmail('');
      setSearchResults([]);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setSearchResults([]);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4" />
        Add Friend
      </Button>
      
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent
          title="Add Friend"
          description="Search for users by name or username to send a friend request."
        >
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter name or username (min 3 characters)..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading} size="icon" className="shrink-0">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {searchResults.length === 0 && email.length >= 3 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found. Try a different search term.
                </p>
              )}
              {searchResults.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">@{profile.username || 'Unknown'}</p>
                    {profile.full_name && (
                      <p className="text-sm text-muted-foreground truncate">{profile.full_name}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddFriend(profile.id)}
                    disabled={loading}
                    className="shrink-0 ml-2"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Close
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};
