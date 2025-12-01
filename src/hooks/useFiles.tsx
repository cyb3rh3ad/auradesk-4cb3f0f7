import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

let FILES_ERROR_TOASTED = false;
export interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface StorageUsage {
  usedBytes: number;
  usedGB: number;
  limitGB: number;
}

export const useFiles = (bucket: string = 'user-files') => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({ usedBytes: 0, usedGB: 0, limitGB: 100 });
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchStorageUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('file_storage_usage')
        .select('total_bytes')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const usedBytes = data?.total_bytes || 0;
      const usedGB = usedBytes / (1024 * 1024 * 1024);

      // Get user's subscription to determine limit
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      const plan = subData?.plan || 'free';
      const limits: Record<string, number> = {
        free: 100,
        advanced: 1024,
        professional: 10240,
      };

      setStorageUsage({
        usedBytes,
        usedGB,
        limitGB: limits[plan],
      });
    } catch (error: any) {
      console.error('Error fetching storage usage:', error);
    }
  };

  const fetchFiles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(user.id, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setFiles(data || []);
      await fetchStorageUsage();
    } catch (error: any) {
      console.error('Error fetching files:', error);
      if (!FILES_ERROR_TOASTED) {
        FILES_ERROR_TOASTED = true;
        toast({
          title: 'Could not load files',
          description: 'Please try again later.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user, bucket]);

  const uploadFile = async (file: File) => {
    if (!user) return false;

    try {
      // Check storage limit
      const fileSizeGB = file.size / (1024 * 1024 * 1024);
      if (storageUsage.usedGB + fileSizeGB > storageUsage.limitGB) {
        toast({
          title: 'Storage limit exceeded',
          description: `You've reached your ${storageUsage.limitGB}GB storage limit. Upgrade your plan for more storage.`,
          variant: 'destructive',
        });
        return false;
      }

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;

      // Update storage usage
      const newUsedBytes = storageUsage.usedBytes + file.size;
      await supabase
        .from('file_storage_usage')
        .upsert({
          user_id: user.id,
          total_bytes: newUsedBytes,
        });

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      fetchFiles();
      return true;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
      return false;
    }
  };

  const downloadFile = async (fileName: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(`${user.id}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const deleteFile = async (fileName: string, fileSize: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([`${user.id}/${fileName}`]);

      if (error) throw error;

      // Update storage usage
      const newUsedBytes = Math.max(0, storageUsage.usedBytes - fileSize);
      await supabase
        .from('file_storage_usage')
        .upsert({
          user_id: user.id,
          total_bytes: newUsedBytes,
        });

      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });

      fetchFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  return {
    files,
    loading,
    storageUsage,
    uploadFile,
    downloadFile,
    deleteFile,
    refetch: fetchFiles,
  };
};
