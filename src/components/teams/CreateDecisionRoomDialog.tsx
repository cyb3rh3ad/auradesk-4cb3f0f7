import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Vote, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateDecisionRoomDialogProps {
  onCreateRoom: (
    title: string,
    description: string,
    options: string[],
    votingType: string,
    isAnonymous: boolean,
    deadline?: Date,
  ) => Promise<any>;
  trigger?: React.ReactNode;
}

export function CreateDecisionRoomDialog({ onCreateRoom, trigger }: CreateDecisionRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [votingType, setVotingType] = useState('single');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((o, i) => i === index ? value : o));
  };

  const handleCreate = async () => {
    const validOptions = options.filter(o => o.trim());
    if (!title.trim() || validOptions.length < 2) return;
    setCreating(true);

    await onCreateRoom(
      title.trim(),
      description.trim(),
      validOptions,
      votingType,
      isAnonymous,
      hasDeadline && deadline ? new Date(deadline) : undefined,
    );

    setCreating(false);
    setOpen(false);
    setTitle('');
    setDescription('');
    setOptions(['', '']);
    setVotingType('single');
    setIsAnonymous(true);
    setHasDeadline(false);
    setDeadline('');
  };

  const validCount = options.filter(o => o.trim()).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Vote className="w-4 h-4" />
            New Decision
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-primary" />
            Create Decision Room
          </DialogTitle>
          <DialogDescription>
            Let your team vote on decisions collaboratively
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dr-title">Question / Title</Label>
            <Input
              id="dr-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What should we decide?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dr-desc">Description (optional)</Label>
            <Textarea
              id="dr-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add context for the team..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Options ({validCount}/10)</Label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'][i % 10] }}
                  />
                  <Input
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="h-9"
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeOption(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={addOption}>
                <Plus className="w-3 h-3" /> Add option
              </Button>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Multi-vote</p>
                <p className="text-xs text-muted-foreground">Allow voting for multiple options</p>
              </div>
              <Switch
                checked={votingType === 'multiple'}
                onCheckedChange={c => setVotingType(c ? 'multiple' : 'single')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Anonymous</p>
                <p className="text-xs text-muted-foreground">Hide who voted for what</p>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Deadline</p>
                <p className="text-xs text-muted-foreground">Auto-close voting at a specific time</p>
              </div>
              <Switch checked={hasDeadline} onCheckedChange={setHasDeadline} />
            </div>

            {hasDeadline && (
              <Input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="h-9"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim() || validCount < 2}>
            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
