import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PWA Update Handler - Manages automatic updates for the installed PWA
 * 
 * This component:
 * 1. Checks for updates periodically (every 60 seconds when online)
 * 2. Auto-updates in the background when a new version is available
 * 3. Shows a toast notification when an update is ready
 * 4. Reloads the app to apply the update
 */
export const PWAUpdateHandler = () => {
  const [showReload, setShowReload] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Check for updates every 60 seconds when the app is focused
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Check for updates periodically
        setInterval(() => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update();
          }
        }, 60 * 1000); // Every 60 seconds
        
        console.log('PWA: Service worker registered');
      }
    },
    onRegisterError(error) {
      console.error('PWA: Service worker registration failed:', error);
    },
  });

  // When a new version is available
  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
      
      // Show toast with update option
      toast('Update Available', {
        description: 'A new version is ready. Tap to update now.',
        duration: 10000,
        icon: <RefreshCw className="w-4 h-4 text-primary animate-spin" />,
        action: {
          label: 'Update',
          onClick: () => {
            updateServiceWorker(true);
          },
        },
      });
      
      // Auto-update after 5 seconds if user doesn't interact
      const autoUpdateTimer = setTimeout(() => {
        updateServiceWorker(true);
      }, 5000);
      
      return () => clearTimeout(autoUpdateTimer);
    }
  }, [needRefresh, updateServiceWorker]);

  // Also handle visibility change - refresh when app comes back to focus if update pending
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && showReload) {
        // App came back to foreground with pending update - apply it
        updateServiceWorker(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showReload, updateServiceWorker]);

  // This component doesn't render anything visible
  // Updates are handled via toast notifications
  return null;
};
