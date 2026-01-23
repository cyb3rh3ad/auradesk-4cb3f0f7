import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CreateGroupDialogProps {
  onGroupCreated: () => void;
}

export const CreateGroupDialog = ({ onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setLoading(true);

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        name: groupName,
        is_group: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (convError || !conversation) {
      toast({
        title: 'Error',
        description: 'Failed to create group.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Add creator as member
    const { error: memberError } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
      });

    if (memberError) {
      toast({
        title: 'Error',
        description: 'Failed to add you to the group.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Group created!',
        description: `${groupName} has been created.`,
      });
      setOpen(false);
      setGroupName('');
      onGroupCreated();
    }
    setLoading(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Users className="w-4 h-4" />
        New Group
      </Button>
      
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent
          title="Create Group"
          description="Create a new group chat for your team."
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!groupName.trim() || loading} className="flex-1 sm:flex-initial">
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};
