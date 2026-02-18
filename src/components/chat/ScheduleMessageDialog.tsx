import { useState } from 'react';
import { Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ScheduleMessageDialogProps {
  conversationId: string;
  messageContent: string;
  onScheduled: () => void;
}

export const ScheduleMessageDialog = ({ conversationId, messageContent, onScheduled }: ScheduleMessageDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dateTime, setDateTime] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    if (!user || !dateTime || !messageContent.trim()) return;

    const scheduledAt = new Date(dateTime);
    if (scheduledAt <= new Date()) {
      toast.error('Please select a future time');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('scheduled_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent.trim(),
        scheduled_at: scheduledAt.toISOString(),
      } as any);

    if (error) {
      toast.error('Failed to schedule message');
    } else {
      toast.success(`Message scheduled for ${format(scheduledAt, 'MMM d, h:mm a')}`);
      setOpen(false);
      onScheduled();
    }
    setSaving(false);
  };

  // Get minimum datetime (now + 1 minute)
  const minDateTime = format(new Date(Date.now() + 60000), "yyyy-MM-dd'T'HH:mm");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground hover:text-foreground touch-manipulation shrink-0 rounded-full"
          disabled={!messageContent.trim()}
          title="Schedule message"
        >
          <Clock className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Schedule Message
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-sm line-clamp-3">{messageContent || 'Type a message first'}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Send at</label>
            <Input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              min={minDateTime}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={saving || !dateTime || !messageContent.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
