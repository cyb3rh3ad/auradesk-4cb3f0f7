import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  publishedAt: string;
  onDownload: () => void;
  onDismiss: () => void;
}

export const UpdateDialog = memo(function UpdateDialog({
  open,
  onOpenChange,
  currentVersion,
  latestVersion,
  releaseNotes,
  publishedAt,
  onDownload,
  onDismiss,
}: UpdateDialogProps) {
  const timeAgo = formatDistanceToNow(new Date(publishedAt), { addSuffix: true });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg shadow-primary/25"
          >
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          
          <DialogTitle className="text-xl font-bold">
            Update Available
          </DialogTitle>
          
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">
                  v{currentVersion}
                </span>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  →
                </motion.span>
                <span className="px-2 py-1 rounded-md bg-primary/20 text-primary font-medium">
                  {latestVersion}
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Released {timeAgo}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Release Notes */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 max-h-32 overflow-y-auto">
          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            What's New
          </h4>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {releaseNotes}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={onDownload}
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            <Download className="w-4 h-4" />
            Download Update
          </Button>
          
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Remind Me Later
          </Button>
        </div>

        {/* Subtle hint */}
        <p className="text-[10px] text-center text-muted-foreground/60 mt-2">
          The download will open in your browser. Install the APK to update.
        </p>
      </DialogContent>
    </Dialog>
  );
});
