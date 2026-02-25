import { useState, useEffect } from 'react';
import { usePromises } from '@/hooks/usePromises';
import { CreatePromiseDialog } from './CreatePromiseDialog';
import { PromiseCard } from './PromiseCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileSignature, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PromisesPanelProps {
  teamId: string;
}

export function PromisesPanel({ teamId }: PromisesPanelProps) {
  const { promises, loading, createPromise, signPromise, declinePromise } = usePromises(teamId);
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  // Fetch team members for signer selection
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

  const pending = promises.filter(p => p.status === 'pending');
  const fulfilled = promises.filter(p => p.status === 'fulfilled');
  const declined = promises.filter(p => p.signatures.some(s => s.status === 'declined'));

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
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Promise
        </Button>
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
