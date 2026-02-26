import { useEffect, useRef } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { webPushService } from '@/services/webPushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Bump this version to force re-prompt ALL users (clears old state)
const PUSH_PROMPT_VERSION = '3';

/**
 * Single unified push notification initializer.
 * One permission covers everything: messages, calls, updates.
 * Shows ONE prompt per version, never nags.
 */
export const PushNotificationInit = () => {
  const { isSupported: isNativeSupported } = usePushNotifications();
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user || isNativeSupported || hasRun.current) return;
    hasRun.current = true;

    let timer: ReturnType<typeof setTimeout>;

    const initWebPush = async () => {
      if (!webPushService.isSupported()) return;

      // Permission denied at browser level — nothing we can do
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return;

      // Already granted — silently ensure subscription is active
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const ok = await webPushService.initialize();
        if (ok && !webPushService.isSubscribed()) {
          await webPushService.requestPermissionAndSubscribe();
        } else if (ok) {
          // Already subscribed, refresh subscription in background
          await webPushService.refreshSubscription();
        }
        return;
      }

      // Check if we already prompted for this version
      const askedVersion = localStorage.getItem('auradesk-webpush-version');
      if (askedVersion === PUSH_PROMPT_VERSION) return;

      // Initialize the service (fetch VAPID key)
      const initialized = await webPushService.initialize();
      if (!initialized) return;

      // Show ONE prompt after a short delay so user settles in
      timer = setTimeout(() => {
        localStorage.setItem('auradesk-webpush-version', PUSH_PROMPT_VERSION);

        toast('🔔 Stay in the loop', {
          description: 'Enable notifications to get alerts for calls, messages, and updates — even when the app is closed.',
          duration: 30000,
          action: {
            label: 'Enable',
            onClick: async () => {
              const success = await webPushService.requestPermissionAndSubscribe();
              if (success) {
                toast.success('You\'re all set! You\'ll get alerts for calls and messages.');
              } else {
                toast.error('Could not enable notifications. Check your browser settings.');
              }
            },
          },
        });
      }, 3000);
    };

    initWebPush();

    return () => {
      clearTimeout(timer);
    };
  }, [user, isNativeSupported]);

  return null;
};
