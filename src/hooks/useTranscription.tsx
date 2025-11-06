import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TranscriptionSegment {
  text: string;
  timestamp: number;
}

export const useTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptionSegment[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async (meetingId: string) => {
    try {
      // Check if window is defined (for SSR)
      if (typeof window === 'undefined') return;
      
      // Check for browser support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast({
          title: 'Not Supported',
          description: 'Speech recognition is not supported on this device. Try using Chrome on desktop.',
          variant: 'destructive',
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1] as any;
        
        if (latestResult.isFinal) {
          const text = latestResult[0].transcript;
          setTranscript(prev => [...prev, {
            text,
            timestamp: Date.now(),
          }]);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: 'Transcription Error',
          description: 'An error occurred during transcription',
          variant: 'destructive',
        });
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);

      toast({
        title: 'Recording Started',
        description: 'AI is now transcribing your meeting',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start recording',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(async (meetingId: string) => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      setIsRecording(false);

      // Save transcript to database
      if (transcript.length > 0) {
        const fullTranscript = transcript.map(seg => seg.text).join(' ');
        
        const { error } = await supabase
          .from('meeting_transcripts' as any)
          .insert({
            meeting_id: meetingId,
            full_transcript: fullTranscript,
          });

        if (error) throw error;

        toast({
          title: 'Transcript Saved',
          description: 'Meeting transcript has been saved successfully',
        });

        setTranscript([]);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to save transcript',
        variant: 'destructive',
      });
    }
  }, [transcript, toast]);

  const processTranscript = useCallback(async (
    transcriptId: string,
    text: string,
    processingType: string,
    customInstructions?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-transcript', {
        body: { text, processingType, customInstructions },
      });

      if (error) throw error;

      // Save processed transcript
      await supabase
        .from('processed_transcripts' as any)
        .insert({
          transcript_id: transcriptId,
          processing_type: processingType,
          content: data.content,
        });

      return data.content;
    } catch (error) {
      console.error('Error processing transcript:', error);
      throw error;
    }
  }, []);

  return {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
    processTranscript,
  };
};