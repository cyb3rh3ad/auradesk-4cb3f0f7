import { useState, useEffect } from 'react';
import { usePromises } from '@/hooks/usePromises';
import { CreatePromiseDialog } from './CreatePromiseDialog';
import { PromiseCard } from './PromiseCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, FileSignature, Loader2, Bell, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface PromisesPanelProps {
  teamId: string;
}

interface PromiseNotification {
  id: string;
  promise_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function PromisesPanel({ teamId }: PromisesPanelProps) {
  const { user } = useAuth();
  const { promises, loading, createPromise, signPromise, declinePromise } = usePromises(teamId);
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<PromiseNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  // Fetch team members
  useEffect(() => {
    const fetchMembers = async () => {
      const { data: tm } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
      if (!tm?.length) return;
      const ids = tm.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids);
      setMembers(profiles || []);
    };
    fetchMembers();
  }, [teamId]);

  // Fetch & subscribe to notifications
  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('promise_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications((data as PromiseNotification[]) || []);
    };
    fetchNotifs();

    const channel = supabase
      .channel('promise-notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'promise_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        setNotifications(prev => [payload.new as PromiseNotification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('promise_notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'signed': return 'text-blue-500';
      case 'fulfilled': return 'text-green-500';
      case 'broken': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const pending = promises.filter(p => p.status === 'pending');
  const fulfilled = promises.filter(p => p.status === 'fulfilled');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Verified Promises</h2>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between p-3 border-b">
                <span className="text-sm font-medium">Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-64">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No notifications</p>
                ) : (
                  <div className="divide-y">
                    {notifications.map(n => (
                      <div key={n.id} className={`px-3 py-2.5 text-xs ${!n.read ? 'bg-accent/30' : ''}`}>
                        <p className={`${getNotifColor(n.type)} font-medium capitalize`}>{n.type}</p>
                        <p className="text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-muted-foreground/60 mt-1 text-[10px]">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Promise
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled ({fulfilled.length})</TabsTrigger>
          <TabsTrigger value="all">All ({promises.length})</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-4">
          <TabsContent value="pending" className="mt-0 space-y-3">
            {pending.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="w-10 h-10 mx-auto opacity-40 mb-2" />
                <p>No pending promises</p>
              </div>
            ) : (
              pending.map(p => <PromiseCard key={p.id} promise={p} onSign={signPromise} onDecline={declinePromise} />)
            )}
          </TabsContent>
          <TabsContent value="fulfilled" className="mt-0 space-y-3">
            {fulfilled.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No fulfilled promises yet</p>
              </div>
            ) : (
              fulfilled.map(p => <PromiseCard key={p.id} promise={p} onSign={signPromise} onDecline={declinePromise} />)
            )}
          </TabsContent>
          <TabsContent value="all" className="mt-0 space-y-3">
            {promises.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="w-10 h-10 mx-auto opacity-40 mb-2" />
                <p>No promises created yet</p>
                <p className="text-xs mt-1">Create one to get started</p>
              </div>
            ) : (
              promises.map(p => <PromiseCard key={p.id} promise={p} onSign={signPromise} onDecline={declinePromise} />)
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <CreatePromiseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        onCreate={createPromise}
      />
    </div>
  );
}
