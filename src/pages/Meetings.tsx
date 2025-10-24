import { useState } from 'react';
import { useMeetings } from '@/hooks/useMeetings';
import { useTeams } from '@/hooks/useTeams';
import { useAIChat } from '@/hooks/useAIChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Plus, Video, Loader2, Sparkles, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const Meetings = () => {
  const { meetings, loading, createMeeting, saveSummary } = useMeetings();
  const { teams } = useTeams();
  const { summarize, isLoading: isGeneratingSummary } = useAIChat();
  const [createOpen, setCreateOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [teamId, setTeamId] = useState<string>('');
  const [transcriptText, setTranscriptText] = useState('');
  const [summary, setSummary] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateMeeting = async () => {
    if (!title.trim() || !scheduledDate || !scheduledTime) return;
    
    setCreating(true);
    const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    await createMeeting(title, description, dateTime, parseInt(duration), teamId || undefined);
    setCreating(false);
    setCreateOpen(false);
    setTitle('');
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setDuration('60');
    setTeamId('');
  };

  const handleGenerateSummary = async () => {
    if (!transcriptText.trim() || isGeneratingSummary) return;
    
    try {
      const generatedSummary = await summarize(transcriptText);
      if (generatedSummary) {
        setSummary(generatedSummary);
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  const handleSaveSummary = async () => {
    if (!summary.trim() || !selectedMeetingId) return;
    
    await saveSummary(selectedMeetingId, summary);
    setSummaryOpen(false);
    setSummary('');
    setTranscriptText('');
  };

  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) > new Date() && m.status === 'scheduled'
  );
  const pastMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) <= new Date() || m.status === 'completed'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">Meetings</h2>
          <p className="text-muted-foreground">Schedule and manage video meetings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSummaryOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Summary
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>Create a new video meeting</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Meeting title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Meeting description"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="15"
                    step="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team">Team (optional)</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMeeting} disabled={creating || !title.trim()}>
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Upcoming Meetings</h3>
            {upcomingMeetings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center space-y-2">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{meeting.title}</CardTitle>
                          <CardDescription>{meeting.description}</CardDescription>
                        </div>
                        {meeting.meeting_link && (
                          <Button size="sm" asChild>
                            <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                              <Video className="w-4 h-4 mr-2" />
                              Join
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(meeting.scheduled_at), 'PPP')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(meeting.scheduled_at), 'p')} ({meeting.duration_minutes}m)
                        </div>
                        {meeting.team_name && (
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {meeting.team_name}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Past Meetings</h3>
            {pastMeetings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center space-y-2">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No past meetings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastMeetings.map((meeting) => (
                  <Card key={meeting.id} className="opacity-75">
                    <CardHeader>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <CardDescription>{meeting.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(meeting.scheduled_at), 'PPP')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.duration_minutes}m
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Meeting Summary</DialogTitle>
            <DialogDescription>
              Paste meeting transcript to generate AI summary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transcript">Meeting Transcript</Label>
              <Textarea
                id="transcript"
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste meeting transcript here..."
                rows={8}
              />
            </div>
            {summary && (
              <div className="space-y-2">
                <Label>Generated Summary</Label>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap">{summary}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryOpen(false)}>
              Cancel
            </Button>
            {!summary ? (
              <Button onClick={handleGenerateSummary} disabled={isGeneratingSummary || !transcriptText.trim()}>
                {isGeneratingSummary && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </Button>
            ) : (
              <Button onClick={handleSaveSummary}>
                Save Summary
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Meetings;
