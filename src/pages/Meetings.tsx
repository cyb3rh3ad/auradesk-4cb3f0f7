import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMeetings } from '@/hooks/useMeetings';
import { useTeams } from '@/hooks/useTeams';
import { useTranscription } from '@/hooks/useTranscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Video, Loader2, Clock, ExternalLink, Mic, MicOff, FileText, Users, Sparkles, Play, Zap } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { TranscriptViewer } from '@/components/meetings/TranscriptViewer';
import { AIAssistant } from '@/components/meetings/AIAssistant';
import { MeetingRoom } from '@/components/meetings/MeetingRoom';
import { cn } from '@/lib/utils';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';

const Meetings = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { meetings, loading, createMeeting, refetch } = useMeetings();
  const { teams } = useTeams();
  const { isRecording, startRecording, stopRecording } = useTranscription();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTranscriptOpen, setViewTranscriptOpen] = useState(false);
  const [meetingRoomOpen, setMeetingRoomOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [selectedMeetingTitle, setSelectedMeetingTitle] = useState<string>('');
  const [initialVideo, setInitialVideo] = useState(true);
  const [recordingMeetingId, setRecordingMeetingId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [teamId, setTeamId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Handle room query parameter for direct call links
  useEffect(() => {
    const roomId = searchParams.get('room');
    const videoParam = searchParams.get('video');
    if (roomId && !loading) {
      const meeting = meetings.find(m => m.id === roomId);
      if (meeting) {
        setSelectedMeetingId(meeting.id);
        setSelectedMeetingTitle(meeting.title);
        setInitialVideo(videoParam !== 'false');
        setMeetingRoomOpen(true);
        // Clear the query params
        setSearchParams({});
      } else {
        // Meeting not found, clear params
        setSearchParams({});
      }
    }
  }, [searchParams, meetings, loading, setSearchParams]);

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

  const handleInstantMeeting = async () => {
    setCreating(true);
    const now = new Date();
    const meeting = await createMeeting(
      'Instant Meeting', 
      '', 
      now, 
      60, 
      undefined
    );
    setCreating(false);
    if (meeting) {
      setSelectedMeetingId(meeting.id);
      setSelectedMeetingTitle(meeting.title);
      setInitialVideo(true);
      setMeetingRoomOpen(true);
    }
  };

  const handleStartRecording = async (meetingId: string) => {
    setRecordingMeetingId(meetingId);
    await startRecording(meetingId);
  };

  const handleStopRecording = async () => {
    if (recordingMeetingId) {
      await stopRecording(recordingMeetingId);
      setRecordingMeetingId('');
    }
  };

  const handleViewTranscript = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setViewTranscriptOpen(true);
  };

  const handleJoinMeeting = (meetingId: string, meetingTitle: string) => {
    setSelectedMeetingId(meetingId);
    setSelectedMeetingTitle(meetingTitle);
    setInitialVideo(true);
    setMeetingRoomOpen(true);
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
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
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading meetings...</p>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    await refetch();
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-6 border-b border-border/40 bg-gradient-to-b from-card/50 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl mx-auto">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Meetings</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Schedule meetings and get AI-powered transcriptions & summaries
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleInstantMeeting}
              disabled={creating}
              variant="secondary"
              className="gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Instant Meeting
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                  <Plus className="w-4 h-4" />
                  Schedule
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>Create a video meeting with AI transcription</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Weekly team sync"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this meeting about?"
                    rows={2}
                    className="bg-background/50 resize-none"
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
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team">Team (optional)</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger className="bg-background/50">
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
                <Button 
                  onClick={handleCreateMeeting} 
                  disabled={creating || !title.trim() || !scheduledDate || !scheduledTime}
                  className="gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
          {/* Upcoming Meetings */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Upcoming</h3>
              {upcomingMeetings.length > 0 && (
                <Badge variant="secondary" className="ml-2">{upcomingMeetings.length}</Badge>
              )}
            </div>
            {upcomingMeetings.length === 0 ? (
              <Card className="border-dashed border-2 bg-card/30">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-primary/50" />
                  </div>
                  <p className="font-medium text-foreground/80">No upcoming meetings</p>
                  <p className="text-sm text-muted-foreground mt-1">Schedule a meeting to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingMeetings.map((meeting) => {
                  const meetingDate = new Date(meeting.scheduled_at);
                  const isRecordingThis = isRecording && recordingMeetingId === meeting.id;

                  return (
                    <Card 
                      key={meeting.id} 
                      className={cn(
                        "group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50 overflow-hidden",
                        isToday(meetingDate) && "ring-2 ring-primary/20"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={isToday(meetingDate) ? "default" : "secondary"}
                                className={cn(
                                  "text-[10px] px-2 py-0",
                                  isToday(meetingDate) && "bg-gradient-to-r from-primary to-accent"
                                )}
                              >
                                {getDateLabel(meetingDate)}
                              </Badge>
                              {meeting.team_name && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0 gap-1">
                                  <Users className="w-3 h-3" />
                                  {meeting.team_name}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base truncate">{meeting.title}</CardTitle>
                            {meeting.description && (
                              <CardDescription className="line-clamp-1 mt-1">{meeting.description}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{format(meetingDate, 'h:mm a')}</span>
                          </div>
                          <span className="text-border">•</span>
                          <span>{meeting.duration_minutes} min</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 gap-2"
                            onClick={() => handleJoinMeeting(meeting.id, meeting.title)}
                          >
                            <Play className="w-4 h-4" />
                            Join Meeting
                          </Button>
                          {isRecordingThis ? (
                            <Button size="sm" variant="destructive" onClick={handleStopRecording} className="gap-1">
                              <MicOff className="w-4 h-4" />
                              Stop
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleStartRecording(meeting.id)}
                              className="gap-1"
                            >
                              <Mic className="w-4 h-4" />
                              Record
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Past Meetings */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Past Meetings</h3>
              {pastMeetings.length > 0 && (
                <Badge variant="outline" className="ml-2">{pastMeetings.length}</Badge>
              )}
            </div>
            {pastMeetings.length === 0 ? (
              <Card className="border-dashed border-2 bg-card/30">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-foreground/80">No past meetings</p>
                  <p className="text-sm text-muted-foreground mt-1">Your completed meetings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pastMeetings.map((meeting) => (
                  <Card 
                    key={meeting.id} 
                    className="group hover:bg-card/80 transition-all border-border/30"
                  >
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{meeting.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(new Date(meeting.scheduled_at), 'MMM d, yyyy')}</span>
                          <span className="text-border">•</span>
                          <span>{meeting.duration_minutes} min</span>
                          {meeting.team_name && (
                            <>
                              <span className="text-border">•</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {meeting.team_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewTranscript(meeting.id)}
                        className="gap-2 shrink-0"
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Summary
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      {/* Transcript Dialog */}
      <Dialog open={viewTranscriptOpen} onOpenChange={setViewTranscriptOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Meeting Transcript & AI Assistant
            </DialogTitle>
            <DialogDescription>
              View transcript, generate AI summaries, or ask questions about this meeting
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              <TranscriptViewer meetingId={selectedMeetingId} />
              <AIAssistant transcriptContext="" />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Meeting Room Dialog */}
      <Dialog open={meetingRoomOpen} onOpenChange={setMeetingRoomOpen}>
        <DialogContent className="max-w-6xl h-[90vh] p-0">
          <MeetingRoom 
            meetingId={selectedMeetingId}
            meetingTitle={selectedMeetingTitle}
            onClose={() => setMeetingRoomOpen(false)}
            initialVideo={initialVideo}
          />
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full overflow-auto">
        {content}
      </PullToRefresh>
    );
  }

  return content;
};

export default Meetings;
