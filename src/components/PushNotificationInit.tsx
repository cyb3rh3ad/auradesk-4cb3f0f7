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
 * Unified push notification initializer.
 * Forces a modal permission dialog so users can't miss it.
 * Handles both notification + call permissions for background ringing.
 */
export const PushNotificationInit = () => {
  const { isSupported: isNativeSupported } = usePushNotifications();
  const { user } = useAuth();
  const hasRun = useRef(false);
  const [showDialog, setShowDialog] = useState(false);
  const [permissionState, setPermissionState] = useState<'pending' | 'requesting' | 'granted' | 'denied'>('pending');

  useEffect(() => {
    if (!user || isNativeSupported || hasRun.current) return;
    hasRun.current = true;

    const checkAndPrompt = async () => {
      if (!webPushService.isSupported()) {
        console.log('[PushInit] Web push not supported');
        return;
      }

      // Already granted → silently ensure subscription is active
      if (Notification.permission === 'granted') {
        console.log('[PushInit] Already granted, ensuring subscription...');
        await ensureSubscription();
        return;
      }

      // Denied → nothing we can do
      if (Notification.permission === 'denied') {
        console.log('[PushInit] Blocked by browser');
        return;
      }

      // Permission is 'default' → show our modal immediately
      setShowDialog(true);
    };

    // Small delay to let the app settle, then show modal
    const timer = setTimeout(checkAndPrompt, 1500);
    return () => clearTimeout(timer);
  }, [user, isNativeSupported]);

  const ensureSubscription = async () => {
    const ok = await webPushService.initialize();
    if (ok) {
      if (!webPushService.isSubscribed()) {
        await webPushService.requestPermissionAndSubscribe();
      } else {
        await webPushService.refreshSubscription();
      }
    }
  };

  const handleEnable = async () => {
    setPermissionState('requesting');

    // Pre-initialize VAPID key
    await webPushService.initialize();

    // This triggers the browser's native permission prompt
    const success = await webPushService.requestPermissionAndSubscribe();

    if (success) {
      setPermissionState('granted');
      toast.success('Notifications enabled! You\'ll receive alerts for calls and messages even when the app is closed.');
      setTimeout(() => setShowDialog(false), 1500);
    } else {
      setPermissionState('denied');
      toast.error('Notifications were blocked. You can enable them in your browser settings.');
      setTimeout(() => setShowDialog(false), 2000);
    }
  };

  const handleSkip = () => {
    setShowDialog(false);
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Phone className="w-4 h-4 text-green-400" />
              </div>
            </div>
          </div>
          <AlertDialogTitle className="text-center text-lg">
            Enable Notifications & Call Alerts
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <p>
              AuraDesk needs notification permissions to deliver:
            </p>
            <ul className="text-left space-y-1.5 mt-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span><strong>Incoming call ringing</strong> — even when the app is closed</span>
              </li>
              <li className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                <span><strong>New message alerts</strong> — instant delivery</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Without this, you'll miss calls and messages when the app isn't open.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction
            onClick={handleEnable}
            disabled={permissionState === 'requesting'}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {permissionState === 'requesting' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Requesting permission...
              </span>
            ) : permissionState === 'granted' ? (
              <span className="flex items-center gap-2">✅ Enabled!</span>
            ) : (
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Enable Notifications
              </span>
            )}
          </AlertDialogAction>
          {permissionState === 'pending' && (
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Not now
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
