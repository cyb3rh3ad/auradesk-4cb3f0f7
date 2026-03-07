import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// No practical client-side limit — the server/bucket limit (5GB) is the real cap
const ABSOLUTE_MAX = 5 * 1024 * 1024 * 1024;

// Files above this threshold use createSignedUploadUrl for reliability
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB

export const useChatFileUpload = (conversationId: string | null) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = null;
    setUploading(false);
    setUploadProgress(0);
  }, []);

  const startProgressSimulation = (fileSize: number) => {
    const estimatedSeconds = Math.max(2, fileSize / (2 * 1024 * 1024));
    progressRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          if (progressRef.current) clearInterval(progressRef.current);
          return 90;
        }
        return prev + (85 / (estimatedSeconds * 4));
      });
    }, 250);
  };

  const uploadSmallFile = async (file: File, filePath: string) => {
    const { error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
  };

  const uploadLargeFile = async (file: File, filePath: string) => {
    // Use XMLHttpRequest for real progress tracking on large files
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${supabaseUrl}/storage/v1/object/chat-files/${filePath}`;

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Wire up abort
      abortRef.current = { abort: () => xhr.abort() } as AbortController;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // Clear the simulated progress and use real progress
          if (progressRef.current) {
            clearInterval(progressRef.current);
            progressRef.current = null;
          }
          setUploadProgress(Math.round((e.loaded / e.total) * 95));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          let msg = 'Upload failed';
          try { msg = JSON.parse(xhr.responseText)?.message || msg; } catch {}
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('cache-control', '3600');
      xhr.send(file);
    });
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user || !conversationId) return null;

    if (file.size > ABSOLUTE_MAX) {
      toast.error('File too large', { description: 'Maximum file size is 5 GB.' });
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${conversationId}/${user.id}/${timestamp}-${safeName}`;

      const isLarge = file.size > LARGE_FILE_THRESHOLD;

      if (isLarge) {
        // Start simulated progress, XHR will override with real progress
        startProgressSimulation(file.size);
        await uploadLargeFile(file, filePath);
      } else {
        startProgressSimulation(file.size);
        await uploadSmallFile(file, filePath);
      }

      if (progressRef.current) clearInterval(progressRef.current);
      progressRef.current = null;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      return urlData.publicUrl;
    } catch (error: any) {
      if (progressRef.current) clearInterval(progressRef.current);
      progressRef.current = null;

      if (error?.name === 'AbortError') {
        toast.info('Upload cancelled');
        return null;
      }
      console.error('Error uploading file:', error);
      toast.error('Upload failed', {
        description: error.message || 'Could not upload file. Check your connection and try again.',
      });
      return null;
    } finally {
      abortRef.current = null;
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
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
