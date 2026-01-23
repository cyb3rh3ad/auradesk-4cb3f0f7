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

  const uploadFile = async (file: File, relativePath?: string): Promise<boolean> => {
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

      // Use relative path for folder uploads, otherwise just the filename
      const fileName = relativePath || file.name;
      // Sanitize the path to avoid issues with special characters
      const sanitizedName = fileName.replace(/[^\w\s\-_.\/]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${sanitizedName}`;
      
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;

      // Update storage usage in database
      const newUsedBytes = storageUsage.usedBytes + file.size;
      await supabase
        .from('file_storage_usage')
        .upsert({
          user_id: user.id,
          total_bytes: newUsedBytes,
          updated_at: new Date().toISOString(),
        });

      // Update local state immediately for responsive UI
      setStorageUsage(prev => ({
        ...prev,
        usedBytes: newUsedBytes,
        usedGB: newUsedBytes / (1024 * 1024 * 1024),
      }));

      return true;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Upload multiple files with progress tracking
  const uploadFiles = async (
    files: FileList | File[], 
    onProgress?: (current: number, total: number, fileName: string) => void
  ): Promise<{ success: number; failed: number }> => {
    if (!user) return { success: 0, failed: 0 };

    const fileArray = Array.from(files);
    let success = 0;
    let failed = 0;
    
    // Calculate total size to check storage limit upfront
    const totalSize = fileArray.reduce((acc, file) => acc + file.size, 0);
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    
    if (storageUsage.usedGB + totalSizeGB > storageUsage.limitGB) {
      toast({
        title: 'Storage limit exceeded',
        description: `These files would exceed your ${storageUsage.limitGB}GB storage limit. Upgrade your plan for more storage.`,
        variant: 'destructive',
      });
      return { success: 0, failed: fileArray.length };
    }

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      // Get the relative path for folder uploads (webkitRelativePath is set when using directory upload)
      const relativePath = (file as any).webkitRelativePath || file.name;
      
      onProgress?.(i + 1, fileArray.length, file.name);
      
      try {
        await uploadFile(file, relativePath);
        success++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        failed++;
      }
    }

    // Refresh file list after all uploads
    await fetchFiles();

    if (success > 0) {
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${success} file${success > 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
      });
    } else if (failed > 0) {
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${failed} file${failed > 1 ? 's' : ''}`,
        variant: 'destructive',
      });
    }

    return { success, failed };
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

      // Update storage usage in database
      const newUsedBytes = Math.max(0, storageUsage.usedBytes - fileSize);
      await supabase
        .from('file_storage_usage')
        .upsert({
          user_id: user.id,
          total_bytes: newUsedBytes,
          updated_at: new Date().toISOString(),
        });

      // Update local state immediately for responsive UI
      setStorageUsage(prev => ({
        ...prev,
        usedBytes: newUsedBytes,
        usedGB: newUsedBytes / (1024 * 1024 * 1024),
      }));

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
    uploadFiles,
    downloadFile,
    deleteFile,
    refetch: fetchFiles,
  };
};
