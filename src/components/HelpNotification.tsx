import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDismissedHelpRequests } from '@/hooks/useDismissedHelpRequests';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Headphones } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface HelpRequest {
  id: string;
  requester_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
}

export const HelpNotification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const { dismissRequest, isDismissed, filterDismissed } = useDismissedHelpRequests(user?.id);

  useEffect(() => {
    if (!user) return;

    // Fetch pending help requests (without join, fetch profiles separately)
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select('id, requester_id, title, description, status, created_at')
        .eq('status', 'pending')
        .neq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching help requests:', error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch profile data for requesters
        const requesterIds = data.map(h => h.requester_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', requesterIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedRequests = data.map(req => ({
          ...req,
          profiles: profilesMap.get(req.requester_id) || null,
        }));
        
        setRequests(enrichedRequests as any);
      } else {
        setRequests([]);
      }
    };

    fetchRequests();

    // Subscribe to new help requests
    const channel = supabase
      .channel('help-requests-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'help_requests',
        },
        async (payload) => {
          const newRequest = payload.new as any;
          if (newRequest.requester_id !== user.id && newRequest.status === 'pending' && !isDismissed(newRequest.id)) {
            // Fetch the profile data for the requester
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('id', newRequest.requester_id)
              .single();

            setRequests((prev) => {
              // Avoid duplicates
              if (prev.some(r => r.id === newRequest.id)) return prev;
              return [{
                ...newRequest,
                profiles: profile,
              }, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'help_requests',
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status !== 'pending') {
            setRequests((prev) => prev.filter((r) => r.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isDismissed]);

  const handleAccept = async (requestId: string) => {
    if (!user) return;

    try {
      // Generate a random connection code
      const connectionCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error } = await supabase
        .from('help_requests')
        .update({
          status: 'accepted',
          helper_id: user.id,
          connection_code: connectionCode,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Help Request Accepted',
        description: `Connection code: ${connectionCode}`,
      });

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error('Error accepting help request:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept help request',
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = (requestId: string) => {
    dismissRequest(requestId);
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  // Filter out dismissed requests before rendering
  const visibleRequests = filterDismissed(requests);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {visibleRequests.map((request) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 bg-card shadow-lg border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">Help Request</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDismiss(request.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">{request.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {request.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From: {request.profiles?.full_name || request.profiles?.username || 'Unknown user'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAccept(request.id)}
                >
                  Connect & Help
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismiss(request.id)}
                >
                  Dismiss
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
