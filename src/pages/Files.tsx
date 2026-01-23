import { useState, useRef, useCallback, useMemo } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Upload, Download, Trash2, Loader2, HardDrive, FolderUp, Search, X,
  FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, 
  FileSpreadsheet, Presentation, File, FileJson
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ResponsiveAlertDialog } from '@/components/ui/alert-dialog';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const Files = () => {
  const isMobile = useIsMobile();
  const { files, loading, storageUsage, uploadFiles, downloadFile, deleteFile, refetch } = useFiles();
  const [deleteFileData, setDeleteFileData] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const handleRefresh = async () => {
    await refetch();
  };

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase().trim();
    return files.filter(file => 
      file.name.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    await processFiles(selectedFiles);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setUploading(true);
    setUploadProgress({ current: 0, total: fileList.length, fileName: '' });
    
    await uploadFiles(fileList, (current, total, fileName) => {
      setUploadProgress({ current, total, fileName });
    });
    
    setUploading(false);
    setUploadProgress(null);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;

    const items = e.dataTransfer.items;
    const collectedFiles: File[] = [];

    // Process all items (files and folders)
    const processEntry = async (entry: FileSystemEntry, path: string = ''): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise((resolve) => {
          fileEntry.file((file) => {
            // Attach relative path for folder structure
            Object.defineProperty(file, 'webkitRelativePath', {
              value: path + file.name,
              writable: false,
            });
            collectedFiles.push(file);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const dirReader = dirEntry.createReader();
        return new Promise((resolve) => {
          const readEntries = () => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve();
                return;
              }
              for (const childEntry of entries) {
                await processEntry(childEntry, path + entry.name + '/');
              }
              readEntries(); // Continue reading (directories may have batched results)
            });
          };
          readEntries();
        });
      }
    };

    if (items) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
        }
      }
      
      for (const entry of entries) {
        await processEntry(entry);
      }
    }

    if (collectedFiles.length > 0) {
      await processFiles(collectedFiles);
    }
  }, [uploadFiles]);

  const handleDelete = async () => {
    if (!deleteFileData) return;
    setDeleting(true);
    await deleteFile(deleteFileData.name, deleteFileData.size);
    setDeleting(false);
    setDeleteFileData(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  // Get file icon and color based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic'].includes(ext)) {
      return { Icon: FileImage, color: 'text-pink-500', bg: 'bg-pink-500/10' };
    }
    // Videos
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'].includes(ext)) {
      return { Icon: FileVideo, color: 'text-purple-500', bg: 'bg-purple-500/10' };
    }
    // Audio
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
      return { Icon: FileAudio, color: 'text-orange-500', bg: 'bg-orange-500/10' };
    }
    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
      return { Icon: FileArchive, color: 'text-yellow-600', bg: 'bg-yellow-500/10' };
    }
    // Code
    if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'php', 'rb', 'swift', 'kt'].includes(ext)) {
      return { Icon: FileCode, color: 'text-green-500', bg: 'bg-green-500/10' };
    }
    // Spreadsheets
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
      return { Icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-500/10' };
    }
    // Presentations
    if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) {
      return { Icon: Presentation, color: 'text-red-500', bg: 'bg-red-500/10' };
    }
    // JSON/Config
    if (['json', 'yaml', 'yml', 'xml', 'toml'].includes(ext)) {
      return { Icon: FileJson, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    }
    // PDFs
    if (ext === 'pdf') {
      return { Icon: FileText, color: 'text-red-600', bg: 'bg-red-500/10' };
    }
    // Documents
    if (['doc', 'docx', 'txt', 'rtf', 'odt', 'md'].includes(ext)) {
      return { Icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    }
    // Default
    return { Icon: File, color: 'text-muted-foreground', bg: 'bg-muted' };
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
            className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl m-2"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground">Drop files here</p>
                <p className="text-sm text-muted-foreground">Files and folders are supported</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Cloud Storage</h2>
          <p className="text-sm md:text-base text-muted-foreground">Store and manage your files securely</p>
        </div>
        <div className="flex gap-2">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <input
            ref={folderInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            // @ts-ignore - webkitdirectory is a non-standard attribute
            webkitdirectory=""
            directory=""
            multiple
          />
          
          {/* Single Upload Button that opens drawer */}
          <Button 
            onClick={() => setUploadMenuOpen(true)}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : 'Uploading...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>

          {/* Upload Options Drawer */}
          <Drawer open={uploadMenuOpen} onOpenChange={setUploadMenuOpen}>
            <DrawerContent className={cn(!isMobile && "mx-auto max-w-lg")}>
              <DrawerHeader className="border-b border-border">
                <DrawerTitle>Upload</DrawerTitle>
              </DrawerHeader>
              <div className="py-2">
                <button
                  onClick={() => {
                    setUploadMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
                >
                  <Upload className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-base font-medium">Upload Files</span>
                    <p className="text-sm text-muted-foreground">Select one or more files</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setUploadMenuOpen(false);
                    folderInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
                >
                  <FolderUp className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-base font-medium">Upload Folder</span>
                    <p className="text-sm text-muted-foreground">Upload an entire folder with all contents</p>
                  </div>
                </button>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Upload Progress Indicator */}
      {uploading && uploadProgress && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate flex-1 mr-4">
                  Uploading: {uploadProgress.fileName}
                </span>
                <span className="font-medium shrink-0">
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Files list */}
      <ScrollArea className="flex-1">
        {files.length === 0 ? (
          <Card className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="pt-6 pb-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No files yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag & drop files here or click to upload
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredFiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center space-y-2">
              <Search className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No files found</h3>
              <p className="text-sm text-muted-foreground">
                No files match "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {searchQuery && (
              <p className="text-sm text-muted-foreground mb-3">
                {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
              </p>
            )}
            {filteredFiles.map((file) => {
              const { Icon: FileIcon, color, bg } = getFileIcon(file.name);
              return (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("p-2 rounded-lg", bg)}>
                        <FileIcon className={cn("w-5 h-5", color)} />
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
              );
            })}
          </div>
        )}
      </ScrollArea>

      <ResponsiveAlertDialog
        open={!!deleteFileData}
        onOpenChange={() => setDeleteFileData(null)}
        title="Delete File"
        description="Are you sure you want to delete this file? This action cannot be undone."
        cancelText="Cancel"
        actionText={deleting ? "Deleting..." : "Delete"}
        actionVariant="destructive"
        onAction={handleDelete}
        loading={deleting}
      />
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
