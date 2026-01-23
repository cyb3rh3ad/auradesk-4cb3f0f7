import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const PWAUpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check for service worker updates
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);
        
        // Check for updates
        await reg.update();
        
        // If there's a waiting service worker, show update notification
        if (reg.waiting) {
          setShowUpdate(true);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkForUpdates();

    // Check for updates every 30 seconds when app is focused
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    }, 30000);

    // Listen for service worker state changes
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker has taken control, reload to get updates
        window.location.reload();
      });

      // Listen for new service worker installing
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available
                setShowUpdate(true);
              }
            });
          }
        });
      });
    }

    // Check on visibility change (when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Force reload
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-[99999] sm:left-auto sm:right-4 sm:max-w-sm"
        >
          <Card className="p-4 shadow-lg border-primary/20 bg-card">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">Update Available</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  A new version of AuraDesk is ready. Refresh to update.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleUpdate} className="flex-1">
                    Update Now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
