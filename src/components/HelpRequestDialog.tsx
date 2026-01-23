import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTeams } from '@/hooks/useTeams';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveSelect,
  ResponsiveSelectContent,
  ResponsiveSelectItem,
  ResponsiveSelectTrigger,
  ResponsiveSelectValue,
} from '@/components/ui/responsive-select';

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        title="Request Help"
        description="Describe your problem and your team members will be notified"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="team">Team (Optional)</Label>
            <ResponsiveSelect value={selectedTeam} onValueChange={setSelectedTeam}>
              <ResponsiveSelectTrigger>
                <ResponsiveSelectValue placeholder="Select a team" />
              </ResponsiveSelectTrigger>
              <ResponsiveSelectContent title="Select Team">
                <ResponsiveSelectItem value="">No specific team</ResponsiveSelectItem>
                {teams.map((team) => (
                  <ResponsiveSelectItem key={team.id} value={team.id}>
                    {team.name}
                  </ResponsiveSelectItem>
                ))}
              </ResponsiveSelectContent>
            </ResponsiveSelect>
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
        <ResponsiveDialogFooter>
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
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
