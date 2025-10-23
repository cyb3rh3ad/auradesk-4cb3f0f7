import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  status: string;
  team_id: string | null;
  created_by: string;
  created_at: string;
  team_name?: string;
}

export const useMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMeetings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          teams(name)
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const meetingsData = (data || []).map((meeting: any) => ({
        ...meeting,
        team_name: meeting.teams?.name,
      }));

      setMeetings(meetingsData);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meetings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [user]);

  const createMeeting = async (
    title: string,
    description: string,
    scheduledAt: Date,
    duration: number,
    teamId?: string
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title,
          description,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: duration,
          team_id: teamId || null,
          created_by: user.id,
          meeting_link: `https://meet.app/${Math.random().toString(36).substring(7)}`,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('meeting_participants').insert({
        meeting_id: data.id,
        user_id: user.id,
        status: 'accepted',
      });

      toast({
        title: 'Success',
        description: 'Meeting created successfully',
      });

      fetchMeetings();
      return data;
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to create meeting',
        variant: 'destructive',
      });
    }
  };

  const saveSummary = async (meetingId: string, summary: string) => {
    try {
      const blob = new Blob([summary], { type: 'text/plain' });
      const fileName = `summary-${meetingId}-${Date.now()}.txt`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-summaries')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      toast({
        title: 'Success',
        description: 'Summary saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to save summary',
        variant: 'destructive',
      });
    }
  };

  return {
    meetings,
    loading,
    createMeeting,
    saveSummary,
    refetch: fetchMeetings,
  };
};
