import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PWA Update Handler - Shows a simple popup banner when an update is ready.
 * The user must tap it to apply the update. No auto-refresh.
 */
export const PWAUpdateHandler = () => {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Check for updates every 60 seconds when visible & online
        setInterval(() => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update();
          }
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('PWA: Service worker registration failed:', error);
    },
  });

  const showBanner = needRefresh && !dismissed;

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  };

  // Reset dismissed state if a NEW update comes in after dismissal
  useEffect(() => {
    if (needRefresh) setDismissed(false);
  }, [needRefresh]);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={handleUpdate}
          className="fixed top-[env(safe-area-inset-top,0px)] left-0 right-0 z-[9999] flex items-center justify-center px-4 pt-2 cursor-pointer"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 backdrop-blur-xl max-w-sm w-full">
            <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
            <span className="text-sm font-medium flex-1">
              New update available — tap to refresh
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
