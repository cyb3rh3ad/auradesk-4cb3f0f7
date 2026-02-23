import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeams } from '@/hooks/useTeams';
import { Loader2 } from 'lucide-react';

interface HelpRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpRequestDialog = ({ open, onOpenChange }: HelpRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teams } = useTeams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Help</DialogTitle>
          <DialogDescription>
            Describe your problem and your team members will be notified
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="team">Team (Optional)</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Help Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
