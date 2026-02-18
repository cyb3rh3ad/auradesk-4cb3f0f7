import { useState, useRef, useCallback } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, Trash2, File, Loader2, FileText, HardDrive, Image, Film, Music, Code, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return Image;
  if (['mp4','avi','mov','mkv','webm'].includes(ext)) return Film;
  if (['mp3','wav','ogg','flac','aac'].includes(ext)) return Music;
  if (['js','ts','tsx','jsx','py','html','css','json','xml'].includes(ext)) return Code;
  return FileText;
};

const isPreviewable = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['jpg','jpeg','png','gif','webp','svg','bmp','pdf'].includes(ext);
};

const Files = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { files, loading, storageUsage, uploadFile, downloadFile, deleteFile, refetch } = useFiles();
  const [deleteFileData, setDeleteFileData] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setUploading(true);
    await uploadFile(selectedFile);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter.current = 0;
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    setUploading(true);
    for (const f of droppedFiles) {
      await uploadFile(f);
    }
    setUploading(false);
  }, [uploadFile]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handlePreview = async (fileName: string) => {
    if (!user) return;
    const { data } = supabase.storage.from('user-files').getPublicUrl(`${user.id}/${fileName}`);
    if (data?.publicUrl) {
      // For private buckets, create a signed URL
      const { data: signedData } = await supabase.storage.from('user-files').createSignedUrl(`${user.id}/${fileName}`, 300);
      if (signedData?.signedUrl) {
        setPreviewUrl(signedData.signedUrl);
        setPreviewName(fileName);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteFileData) return;
    await deleteFile(deleteFileData.name, deleteFileData.size);
    setDeleteFileData(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const storagePercentage = (storageUsage.usedGB / storageUsage.limitGB) * 100;

  return (
    <div
      className="flex flex-col h-full p-4 md:p-6 space-y-6 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center backdrop-blur-sm"
          >
            <div className="text-center">
              <Upload className="w-16 h-16 text-primary mx-auto mb-3 animate-bounce" />
              <p className="text-xl font-bold text-primary">Drop files here</p>
              <p className="text-sm text-muted-foreground">Release to upload</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Cloud Storage</h2>
          <p className="text-sm md:text-base text-muted-foreground">Store and manage your files securely</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="*/*" multiple />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Upload File</>
            )}
          </Button>
        </div>
      </div>

      {/* Storage Usage Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <CardTitle>Storage Usage</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Used Storage</span>
              <span className="font-medium">{storageUsage.usedGB.toFixed(2)} GB / {storageUsage.limitGB} GB</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
          </div>
          <p className={cn("text-xs", storagePercentage > 90 ? "text-destructive" : "text-muted-foreground")}>
            {storagePercentage > 90 ? "You're running out of storage space." : `${(storageUsage.limitGB - storageUsage.usedGB).toFixed(2)} GB available`}
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="flex-1">
        {files.length === 0 ? (
          <Card className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
            <CardContent className="pt-6 text-center space-y-2">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No files yet</h3>
              <p className="text-sm text-muted-foreground">Drag & drop files here or click to upload</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.name);
              const canPreview = isPreviewable(file.name);
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.metadata?.size || 0)}</span>
                            <span className="hidden sm:inline">{format(new Date(file.created_at), 'PPp')}</span>
                            <span className="sm:hidden">{format(new Date(file.created_at), 'PP')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canPreview && (
                          <Button variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handlePreview(file.name)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => downloadFile(file.name)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setDeleteFileData({ name: file.name, size: file.metadata?.size || 0 })}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* File Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => { setPreviewUrl(null); setPreviewName(''); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <p className="font-medium truncate">{previewName}</p>
          </div>
          <div className="flex items-center justify-center p-4 max-h-[80vh] overflow-auto">
            {previewName.endsWith('.pdf') ? (
              <iframe src={previewUrl || ''} className="w-full h-[75vh] rounded" />
            ) : (
              <img src={previewUrl || ''} alt={previewName} className="max-w-full max-h-[75vh] object-contain rounded" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFileData} onOpenChange={() => setDeleteFileData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Files;
