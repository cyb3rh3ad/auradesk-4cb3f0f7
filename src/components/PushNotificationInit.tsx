import { useEffect, useRef, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { webPushService } from '@/services/webPushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, Phone } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AGGRESSIVE push notification initializer.
 * Forces browser permission request on EVERY login.
 * If already granted, silently re-subscribes. If not, shows blocking modal.
 */
export const PushNotificationInit = () => {
  const { isSupported: isNativeSupported } = usePushNotifications();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [permissionState, setPermissionState] = useState<'pending' | 'requesting' | 'granted' | 'denied'>('pending');
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!user || isNativeSupported) return;
    // Allow re-running when user changes (new login)
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const forceInit = async () => {
      // Check if browser supports push at all
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('[PushInit] Browser does not support push notifications');
        return;
      }

      console.log('[PushInit] Current permission:', Notification.permission);

      if (Notification.permission === 'granted') {
        // Already granted — force re-subscribe to ensure token is in DB
        console.log('[PushInit] Permission granted, force re-subscribing...');
        try {
          const ok = await webPushService.initialize();
          if (ok) {
            // Always force a fresh subscription
            await webPushService.requestPermissionAndSubscribe();
            console.log('[PushInit] Re-subscription complete');
          }
        } catch (err) {
          console.error('[PushInit] Re-subscribe error:', err);
        }
        return;
      }

      if (Notification.permission === 'denied') {
        console.log('[PushInit] Permission denied by browser, cannot override');
        return;
      }

      // Permission is 'default' — show our modal IMMEDIATELY
      console.log('[PushInit] Permission is default, showing modal NOW');
      setShowDialog(true);
    };

    // Run immediately, no delay
    forceInit();
  }, [user, isNativeSupported]);

  // Reset on user change so it re-runs for new logins
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
    };
  }, [user?.id]);

  const handleEnable = async () => {
    setPermissionState('requesting');

    try {
      // Pre-init VAPID key
      await webPushService.initialize();

      // This triggers the browser's native permission prompt
      const success = await webPushService.requestPermissionAndSubscribe();

      if (success) {
        setPermissionState('granted');
        toast.success('Notifications enabled! You\'ll receive call alerts and messages even when the app is closed.');
        setTimeout(() => setShowDialog(false), 1200);
      } else {
        setPermissionState('denied');
        toast.error('Notifications were blocked. Enable them in your browser settings to receive calls.');
        setTimeout(() => setShowDialog(false), 2000);
      }
    } catch (err) {
      console.error('[PushInit] Enable error:', err);
      setPermissionState('denied');
      toast.error('Something went wrong. Try enabling notifications in browser settings.');
      setTimeout(() => setShowDialog(false), 2000);
    }
  };

  const handleSkip = () => {
    setShowDialog(false);
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md z-[9999]">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary animate-bounce" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                <Phone className="w-4 h-4 text-destructive" />
              </div>
            </div>
          </div>
          <AlertDialogTitle className="text-center text-lg">
            Enable Notifications & Call Ringing
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                AuraDesk needs your permission to:
              </p>
              <ul className="text-left space-y-2 mt-3 text-sm">
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span><strong>Ring for incoming calls</strong> — even when the app is in the background or closed</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>Alert for new messages</strong> — instant delivery to your device</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 border border-border rounded-md p-2 bg-muted/50">
                ⚠️ Without this, you will <strong>not hear calls</strong> and will <strong>miss messages</strong> when the app isn't in focus.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-2">
          <AlertDialogAction
            onClick={handleEnable}
            disabled={permissionState === 'requesting'}
            className="w-full"
          >
            {permissionState === 'requesting' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Requesting permission...
              </span>
            ) : permissionState === 'granted' ? (
              <span className="flex items-center gap-2">✅ Enabled!</span>
            ) : (
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Enable Now
              </span>
            )}
          </AlertDialogAction>
          {permissionState === 'pending' && (
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Skip for now (you'll miss calls)
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
