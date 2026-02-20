import { useState, useRef, useCallback, useMemo } from 'react';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Upload, Download, Trash2, Loader2, FileText, HardDrive, Image, Film, Music, Code, Eye, X, LayoutGrid, LayoutList, Search, SortAsc, SortDesc, Clock, FileIcon } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return Image;
  if (['mp4','avi','mov','mkv','webm'].includes(ext)) return Film;
  if (['mp3','wav','ogg','flac','aac'].includes(ext)) return Music;
  if (['js','ts','tsx','jsx','py','html','css','json','xml'].includes(ext)) return Code;
  return FileText;
};

const isImageFile = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext);
};

const isPreviewable = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['jpg','jpeg','png','gif','webp','svg','bmp','pdf'].includes(ext);
};

type ViewMode = 'list' | 'grid';
type SortBy = 'name' | 'date' | 'size';
type SortDir = 'asc' | 'desc';

const Files = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { files, loading, storageUsage, uploadFile, downloadFile, deleteFile, refetch } = useFiles();
  const [deleteFileData, setDeleteFileData] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('auradesk-files-view') as ViewMode) || 'list'; } catch { return 'list'; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Generate thumbnail URLs for image files
  const loadThumbnail = useCallback(async (fileName: string) => {
    if (!user || thumbnailUrls.has(fileName)) return;
    const { data } = await supabase.storage.from('user-files').createSignedUrl(`${user.id}/${fileName}`, 300);
    if (data?.signedUrl) {
      setThumbnailUrls(prev => new Map(prev).set(fileName, data.signedUrl));
    }
  }, [user, thumbnailUrls]);

  // Load thumbnails for visible image files in grid mode
  useMemo(() => {
    if (viewMode === 'grid') {
      files.forEach(f => {
        if (isImageFile(f.name)) loadThumbnail(f.name);
      });
    }
  }, [files, viewMode, loadThumbnail]);

  const setViewModeAndSave = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem('auradesk-files-view', mode); } catch {}
  };

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = files.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === 'size') cmp = (a.metadata?.size || 0) - (b.metadata?.size || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    
    return result;
  }, [files, searchQuery, sortBy, sortDir]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    for (const f of Array.from(selectedFiles)) {
      await uploadFile(f);
    }
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

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handlePreview = async (fileName: string) => {
    if (!user) return;
    const { data: signedData } = await supabase.storage.from('user-files').createSignedUrl(`${user.id}/${fileName}`, 300);
    if (signedData?.signedUrl) {
      setPreviewUrl(signedData.signedUrl);
      setPreviewName(fileName);
    }
  };

  const handleDelete = async () => {
    if (!deleteFileData) return;
    await deleteFile(deleteFileData.name, deleteFileData.size);
    setDeleteFileData(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
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
      className="flex flex-col h-full p-4 md:p-6 space-y-4 md:space-y-6 relative"
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Cloud Storage</h2>
          <p className="text-sm text-muted-foreground">{files.length} file{files.length !== 1 ? 's' : ''} • {formatFileSize(storageUsage.usedGB * 1024 * 1024 * 1024)} used</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="*/*" multiple />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Upload</>
            )}
          </Button>
        </div>
      </div>

      {/* Storage Bar - compact */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Storage</span>
          <span>{storageUsage.usedGB.toFixed(2)} / {storageUsage.limitGB} GB</span>
        </div>
        <Progress value={storagePercentage} className="h-1.5" />
      </div>

      {/* Search + View Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        
        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              {sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setSortBy('name'); setSortDir(prev => sortBy === 'name' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}>
              <FileIcon className="w-4 h-4 mr-2" /> Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy('date'); setSortDir(prev => sortBy === 'date' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'); }}>
              <Clock className="w-4 h-4 mr-2" /> Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSortBy('size'); setSortDir(prev => sortBy === 'size' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'); }}>
              <HardDrive className="w-4 h-4 mr-2" /> Size {sortBy === 'size' && (sortDir === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-none"
            onClick={() => setViewModeAndSave('list')}
          >
            <LayoutList className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 rounded-none"
            onClick={() => setViewModeAndSave('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* File List / Grid */}
      <ScrollArea className="flex-1">
        {filteredFiles.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No files matching "{searchQuery}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <Card className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <CardContent className="pt-6 text-center space-y-2">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No files yet</h3>
                <p className="text-sm text-muted-foreground">Drag & drop files here or click to upload</p>
              </CardContent>
            </Card>
          )
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredFiles.map((file) => {
              const FileIconComponent = getFileIcon(file.name);
              const isImage = isImageFile(file.name);
              const thumbUrl = thumbnailUrls.get(file.name);
              
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative rounded-xl border bg-card/50 hover:bg-card hover:shadow-lg transition-all overflow-hidden cursor-pointer"
                  onClick={() => isPreviewable(file.name) ? handlePreview(file.name) : downloadFile(file.name)}
                >
                  {/* Thumbnail / Icon area */}
                  <div className="aspect-square flex items-center justify-center bg-muted/30 overflow-hidden">
                    {isImage && thumbUrl ? (
                      <img src={thumbUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <FileIconComponent className="w-10 h-10 text-muted-foreground/50" />
                    )}
                  </div>
                  
                  {/* File info */}
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(file.metadata?.size || 0)}</p>
                  </div>
                  
                  {/* Hover actions */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 rounded-lg shadow-md"
                      onClick={(e) => { e.stopPropagation(); downloadFile(file.name); }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 rounded-lg shadow-md"
                      onClick={(e) => { e.stopPropagation(); setDeleteFileData({ name: file.name, size: file.metadata?.size || 0 }); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-1.5">
            {filteredFiles.map((file) => {
              const FileIconComponent = getFileIcon(file.name);
              const canPreview = isPreviewable(file.name);
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow group border-border/50">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <FileIconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{file.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.metadata?.size || 0)}</span>
                            <span className="hidden sm:inline">{format(new Date(file.created_at), 'PPp')}</span>
                            <span className="sm:hidden">{format(new Date(file.created_at), 'PP')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canPreview && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handlePreview(file.name)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => downloadFile(file.name)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDeleteFileData({ name: file.name, size: file.metadata?.size || 0 })}>
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
