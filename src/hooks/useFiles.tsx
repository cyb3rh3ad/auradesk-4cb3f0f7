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

export const useFiles = (bucket: string = 'meeting-summaries') => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFiles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(user.id, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setFiles(data || []);
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
    if (!user) return;

    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      fetchFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
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

  const deleteFile = async (fileName: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([`${user.id}/${fileName}`]);

      if (error) throw error;

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
    uploadFile,
    downloadFile,
    deleteFile,
    refetch: fetchFiles,
  };
};
