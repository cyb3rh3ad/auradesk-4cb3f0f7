import { useState, useRef } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, Trash2, File, Loader2, FileText, HardDrive } from 'lucide-react';
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
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';

const Files = () => {
  const isMobile = useIsMobile();
  const { files, loading, storageUsage, uploadFile, downloadFile, deleteFile, refetch } = useFiles();
  const [deleteFileData, setDeleteFileData] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    await uploadFile(selectedFile);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const content = (
    <div className="flex flex-col h-full p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Cloud Storage</h2>
          <p className="text-sm md:text-base text-muted-foreground">Store and manage your files securely</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </>
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
              <span className="font-medium">
                {storageUsage.usedGB.toFixed(2)} GB / {storageUsage.limitGB} GB
              </span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
          </div>
          <p className={cn(
            "text-xs",
            storagePercentage > 90 ? "text-destructive" : "text-muted-foreground"
          )}>
            {storagePercentage > 90 
              ? "You're running out of storage space. Consider upgrading your plan."
              : `${(storageUsage.limitGB - storageUsage.usedGB).toFixed(2)} GB available`
            }
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="flex-1">
        {files.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center space-y-2">
              <File className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No files yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload files to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => downloadFile(file.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setDeleteFileData({ name: file.name, size: file.metadata?.size || 0 })}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={!!deleteFileData} onOpenChange={() => setDeleteFileData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

export default Files;
