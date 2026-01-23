import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const PWAUpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [autoUpdateCountdown, setAutoUpdateCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-update after countdown
  const startAutoUpdateCountdown = useCallback(() => {
    setAutoUpdateCountdown(10); // 10 second countdown
    
    countdownRef.current = setInterval(() => {
      setAutoUpdateCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Time's up - auto update
          if (countdownRef.current) clearInterval(countdownRef.current);
          window.location.reload();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Check for service worker updates
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        setRegistration(reg);
        
        // Check for updates
        await reg.update();
        
        // If there's a waiting service worker, auto-apply update
        if (reg.waiting) {
          console.log('[PWA] Update available, auto-applying...');
          // Tell the waiting service worker to skip waiting immediately
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          setShowUpdate(true);
          startAutoUpdateCountdown();
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  }, [startAutoUpdateCountdown]);

  useEffect(() => {
    // Initial check after a short delay to not block app startup
    const initialCheck = setTimeout(() => {
      checkForUpdates();
    }, 2000);

    // Check for updates every 15 seconds when app is focused (more aggressive)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    }, 15000);

    // Listen for service worker state changes
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker has taken control, reload to get updates
        console.log('[PWA] Controller changed, reloading...');
        window.location.reload();
      });

      // Listen for new service worker installing
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available - auto apply
                console.log('[PWA] New version installed, activating...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                setShowUpdate(true);
                startAutoUpdateCountdown();
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
      clearTimeout(initialCheck);
      clearInterval(interval);
      if (countdownRef.current) clearInterval(countdownRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates, startAutoUpdateCountdown]);

  const handleUpdate = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setAutoUpdateCountdown(null);
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
                <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">Updating AuraDesk...</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {autoUpdateCountdown !== null 
                    ? `Auto-updating in ${autoUpdateCountdown}s...`
                    : 'A new version is ready. Tap to update now.'}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleUpdate} className="flex-1">
                    {autoUpdateCountdown !== null ? `Update Now (${autoUpdateCountdown}s)` : 'Update Now'}
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
