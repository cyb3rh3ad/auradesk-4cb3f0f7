import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown } from 'lucide-react';
import { useTeams } from '@/hooks/useTeams';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpRequestDialog = ({ open, onOpenChange }: HelpRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teams } = useTeams();
  const isMobile = useIsMobile();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [teamSelectorOpen, setTeamSelectorOpen] = useState(false);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !description.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both a title and description',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.from('help_requests').insert({
        requester_id: user.id,
        team_id: selectedTeam || null,
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Help Request Sent',
        description: 'Your team members have been notified',
      });

      setTitle('');
      setDescription('');
      setSelectedTeam('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating help request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send help request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const teamOptions = [
    { value: '', label: 'No specific team' },
    ...teams.map((team) => ({ value: team.id, label: team.name })),
  ];

  const selectedTeamLabel = teamOptions.find(t => t.value === selectedTeam)?.label || 'Select a team';

  const FormContent = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="team">Team (Optional)</Label>
        {/* Custom team selector button that opens drawer on mobile */}
        <button
          type="button"
          onClick={() => setTeamSelectorOpen(true)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            !selectedTeam && "text-muted-foreground"
          )}
        >
          <span className="line-clamp-1">{selectedTeamLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
        
        {/* Team selector drawer */}
        <Drawer open={teamSelectorOpen} onOpenChange={setTeamSelectorOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b border-border">
              <DrawerTitle>Select Team</DrawerTitle>
            </DrawerHeader>
            <div className="py-2 max-h-[50vh] overflow-y-auto">
              {teamOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedTeam(option.value);
                    setTeamSelectorOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-accent/50 active:bg-accent",
                    selectedTeam === option.value && "bg-accent/30"
                  )}
                >
                  <span className="flex-1">{option.label}</span>
                  {selectedTeam === option.value && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Issue Title</Label>
        <Input
          id="title"
          placeholder="Brief description of the problem"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Detailed Description</Label>
        <Textarea
          id="description"
          placeholder="Provide details about what's happening, what you've tried, error messages, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
      </div>
    </div>
  );

  const ActionButtons = () => (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1 sm:flex-initial">
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-initial">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Help Request'
        )}
      </Button>
    </>
  );

  // Mobile: Use Drawer instead of Dialog
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Request Help</DrawerTitle>
            <DrawerDescription>
              Describe your problem and your team members will be notified
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <FormContent />
          </div>
          <DrawerFooter className="flex-row gap-2">
            <ActionButtons />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Help</DialogTitle>
          <DialogDescription>
            Describe your problem and your team members will be notified
          </DialogDescription>
        </DialogHeader>
        <FormContent />
        <DialogFooter>
          <ActionButtons />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
