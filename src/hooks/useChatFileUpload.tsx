import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { toast } from 'sonner';

// Max single file size per plan (in bytes)
const MAX_FILE_SIZE: Record<SubscriptionPlan, number> = {
  free: 25 * 1024 * 1024,        // 25 MB
  advanced: 500 * 1024 * 1024,    // 500 MB
  professional: 2 * 1024 * 1024 * 1024, // 2 GB
};

const MAX_FILE_SIZE_LABEL: Record<SubscriptionPlan, string> = {
  free: '25 MB',
  advanced: '500 MB',
  professional: '2 GB',
};

export const useChatFileUpload = (conversationId: string | null) => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getMaxFileSize = () => MAX_FILE_SIZE[plan];
  const getMaxFileSizeLabel = () => MAX_FILE_SIZE_LABEL[plan];

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user || !conversationId) return null;

    const maxSize = getMaxFileSize();
    if (file.size > maxSize) {
      toast.error(`File too large`, {
        description: `Max file size for your plan is ${getMaxFileSizeLabel()}. Upgrade for larger files.`,
      });
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${conversationId}/${user.id}/${timestamp}-${safeName}`;

      const { error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Upload failed', { description: error.message || 'Could not upload file' });
      return null;
    } finally {
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
    maxFileSize: getMaxFileSize(),
    maxFileSizeLabel: getMaxFileSizeLabel(),
    plan,
  };
};
