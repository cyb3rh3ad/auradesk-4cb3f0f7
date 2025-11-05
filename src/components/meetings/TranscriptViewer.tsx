import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, List, Wand2 } from 'lucide-react';
import { useTranscription } from '@/hooks/useTranscription';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { useToast } from '@/hooks/use-toast';

interface TranscriptViewerProps {
  meetingId: string;
}

export const TranscriptViewer = ({ meetingId }: TranscriptViewerProps) => {
  const [transcript, setTranscript] = useState<any>(null);
  const [processedTranscripts, setProcessedTranscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { processTranscript } = useTranscription();
  const { preferences } = useAIPreferences();
  const { toast } = useToast();

  useEffect(() => {
    fetchTranscript();
  }, [meetingId]);

  const fetchTranscript = async () => {
    try {
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('meeting_transcripts' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (transcriptError && transcriptError.code !== 'PGRST116') throw transcriptError;

      if (transcriptData) {
        setTranscript(transcriptData);

        const { data: processedData, error: processedError } = await supabase
          .from('processed_transcripts' as any)
          .select('*')
          .eq('transcript_id', (transcriptData as any).id)
          .order('created_at', { ascending: false });

        if (processedError) throw processedError;
        setProcessedTranscripts(processedData || []);
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transcript',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (type: string) => {
    if (!transcript) return;

    setProcessing(true);
    try {
      await processTranscript(
        transcript.id,
        transcript.full_transcript,
        type,
        type === 'custom' ? preferences?.custom_instructions || undefined : undefined
      );

      toast({
        title: 'Processing Complete',
        description: `Transcript has been converted to ${type}`,
      });

      await fetchTranscript();
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        title: 'Error',
        description: 'Failed to process transcript',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!transcript) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          No transcript available for this meeting
        </p>
      </Card>
    );
  }

  const summaryTranscript = processedTranscripts.find(pt => pt.processing_type === 'summary');
  const bulletPointsTranscript = processedTranscripts.find(pt => pt.processing_type === 'bullet_points');

  return (
    <Card className="p-6">
      <Tabs defaultValue="full" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="full">
            <FileText className="w-4 h-4 mr-2" />
            Full Transcript
          </TabsTrigger>
          <TabsTrigger value="summary">
            <Wand2 className="w-4 h-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="bullets">
            <List className="w-4 h-4 mr-2" />
            Bullet Points
          </TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="mt-4">
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <p className="whitespace-pre-wrap">{transcript.full_transcript}</p>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          {summaryTranscript ? (
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <p className="whitespace-pre-wrap">{summaryTranscript.content}</p>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <p className="text-muted-foreground text-center">
                No summary available yet
              </p>
              <Button
                onClick={() => handleProcess('summary')}
                disabled={processing}
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Summary
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bullets" className="mt-4">
          {bulletPointsTranscript ? (
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="whitespace-pre-wrap">{bulletPointsTranscript.content}</div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <p className="text-muted-foreground text-center">
                No bullet points available yet
              </p>
              <Button
                onClick={() => handleProcess('bullet_points')}
                disabled={processing}
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Bullet Points
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};