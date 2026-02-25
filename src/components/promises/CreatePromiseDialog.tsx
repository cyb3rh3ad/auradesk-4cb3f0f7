import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface CreatePromiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMember[];
  onCreate: (title: string, description: string, deadline: string | null, signerIds: string[]) => Promise<any>;
}

export function CreatePromiseDialog({ open, onOpenChange, members, onCreate }: CreatePromiseDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedSigners, setSelectedSigners] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const toggleSigner = (id: string) => {
    setSelectedSigners(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    await onCreate(title, description, deadline || null, Array.from(selectedSigners));
    setCreating(false);
    onOpenChange(false);
    setTitle('');
    setDescription('');
    setDeadline('');
    setSelectedSigners(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Verified Promise</DialogTitle>
          <DialogDescription>Create a digitally signed accountability agreement</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Promise Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete project by Friday" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details of what's being promised..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Deadline (optional)</Label>
            <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Signers</Label>
              <ScrollArea className="h-[140px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {members.map(m => {
                    const selected = selectedSigners.has(m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => toggleSigner(m.id)}
                        className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-muted/50', selected && 'bg-primary/10')}>
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{(m.full_name || m.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1 text-left truncate">{m.full_name || m.username || 'User'}</span>
                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center', selected ? 'bg-primary border-primary' : 'border-muted-foreground/30')}>
                          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim()}>
            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Promise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
