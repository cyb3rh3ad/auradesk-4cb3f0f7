import { useState, useEffect } from 'react';
import { Pin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PinnedMessage {
  id: string;
  message_id: string;
  pinned_at: string;
  pinned_by: string;
  content?: string;
  sender_name?: string;
  created_at?: string;
}

interface PinnedMessagesDrawerProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}

export const PinnedMessagesDrawer = ({ conversationId, open, onClose }: PinnedMessagesDrawerProps) => {
  const { user } = useAuth();
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPins = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pinned_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('pinned_at', { ascending: false });

    if (data && !error) {
      // Fetch message content for each pin
      const messageIds = data.map(p => p.message_id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id')
        .in('id', messageIds);

      // Fetch sender profiles
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', senderIds);

      const enriched = data.map(pin => {
        const msg = messages?.find(m => m.id === pin.message_id);
        const sender = profiles?.find(p => p.id === msg?.sender_id);
        return {
          ...pin,
          content: msg?.content || '[deleted]',
          sender_name: sender?.full_name || sender?.username || 'Unknown',
          created_at: msg?.created_at,
        };
      });
      setPins(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && conversationId) fetchPins();
  }, [open, conversationId]);

  const handleUnpin = async (pinId: string) => {
    const { error } = await supabase.from('pinned_messages').delete().eq('id', pinId);
    if (error) {
      toast.error('Failed to unpin');
    } else {
      setPins(prev => prev.filter(p => p.id !== pinId));
      toast.success('Message unpinned');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-card border-l border-border z-50 flex flex-col"
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Pinned Messages</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : pins.length === 0 ? (
                <div className="text-center py-12">
                  <Pin className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No pinned messages</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Long-press a message to pin it</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pins.map((pin) => (
                    <div key={pin.id} className="p-3 rounded-xl bg-muted/30 border border-border/30 group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground/80">{pin.sender_name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleUnpin(pin.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground/90 line-clamp-3">{pin.content}</p>
                      {pin.created_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(pin.created_at), 'MMM d, HH:mm')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
