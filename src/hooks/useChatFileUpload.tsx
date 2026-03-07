import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// 5 GB hard cap (Supabase storage max per object)
const ABSOLUTE_MAX = 5 * 1024 * 1024 * 1024;

export const useChatFileUpload = (conversationId: string | null) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setUploadProgress(0);
  }, []);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user || !conversationId) return null;

    if (file.size > ABSOLUTE_MAX) {
      toast.error('File too large', {
        description: 'Maximum file size is 5 GB.',
      });
      return null;
    }

    setUploading(true);
    setUploadProgress(0);
    abortRef.current = new AbortController();

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${conversationId}/${user.id}/${timestamp}-${safeName}`;

      // Simulate progress for large files since supabase-js doesn't expose it
      const estimatedSeconds = Math.max(1, file.size / (2 * 1024 * 1024)); // ~2MB/s estimate
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + (90 / (estimatedSeconds * 4));
        });
      }, 250);

      const { error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      return urlData.publicUrl;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        toast.info('Upload cancelled');
        return null;
      }
      console.error('Error uploading file:', error);
      toast.error('Upload failed', {
        description: error.message || 'Could not upload file. Try a smaller file or check your connection.',
      });
      return null;
    } finally {
      abortRef.current = null;
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }
    return urls;
  };

  return {
    uploading,
    uploadProgress,
    uploadFile,
    uploadFiles,
    cancelUpload,
    maxFileSize: ABSOLUTE_MAX,
    maxFileSizeLabel: '5 GB',
  };
};
