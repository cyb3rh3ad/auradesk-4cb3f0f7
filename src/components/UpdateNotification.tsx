import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle, XCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isElectronApp } from "@/hooks/useIsElectron";

interface UpdateInfo {
  version: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

type UpdateStatus = "idle" | "available" | "downloading" | "downloaded" | "error";

export const UpdateNotification = () => {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isElectronApp()) return;

    const api = (window as any).electronAPI;
    if (!api) return;

    api.onUpdateAvailable?.((info: UpdateInfo) => {
      setUpdateInfo(info);
      setStatus("available");
      setDismissed(false);
    });

    api.onUpdateDownloadProgress?.((prog: DownloadProgress) => {
      setProgress(prog);
      setStatus("downloading");
    });

    api.onUpdateDownloaded?.((info: UpdateInfo) => {
      setUpdateInfo(info);
      setStatus("downloaded");
    });

    api.onUpdateError?.((error: { message: string }) => {
      setErrorMessage(error.message);
      setStatus("error");
    });

    return () => {
      api.removeUpdateListeners?.();
    };
  }, []);

  const handleInstall = () => {
    const api = (window as any).electronAPI;
    api?.installUpdate?.();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  if (!isElectronApp() || status === "idle" || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-[9999] w-80"
      >
        <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-3">
              {status === "downloading" && (
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary animate-bounce" />
                </div>
              )}
              {status === "available" && (
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
              )}
              {status === "downloaded" && (
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-accent" />
                </div>
              )}
              {status === "error" && (
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm">
                  {status === "available" && "Update Available"}
                  {status === "downloading" && "Downloading Update"}
                  {status === "downloaded" && "Ready to Install"}
                  {status === "error" && "Update Error"}
                </h3>
                {updateInfo && (
                  <p className="text-xs text-muted-foreground">
                    Version {updateInfo.version}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {status === "downloading" && progress && (
              <>
                <Progress value={progress.percent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress.percent.toFixed(1)}%</span>
                  <span>
                    {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
                  </span>
                  <span>{formatSpeed(progress.bytesPerSecond)}</span>
                </div>
              </>
            )}

            {status === "available" && (
              <p className="text-sm text-muted-foreground">
                A new version is being downloaded automatically...
              </p>
            )}

            {status === "downloaded" && (
              <>
                <p className="text-sm text-muted-foreground">
                  The update has been downloaded and is ready to install. Restart to apply.
                </p>
                <Button
                  onClick={handleInstall}
                  className="w-full gap-2"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restart & Install
                </Button>
              </>
            )}

            {status === "error" && (
              <p className="text-sm text-destructive">
                {errorMessage || "Failed to download update. Please try again later."}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
