import { useEffect, useRef } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { webPushService } from '@/services/webPushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Bump this to force ALL users to re-prompt
const PUSH_PROMPT_VERSION = '4';

/**
 * Unified push notification initializer.
 * Aggressively ensures every user gets subscribed for messages + calls.
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
      if (!webPushService.isSupported()) {
        console.log('[PushInit] Web push not supported in this browser');
        return;
      }

      // Permission denied at browser level — nothing we can do
      if (Notification.permission === 'denied') {
        console.log('[PushInit] Notifications blocked by browser');
        return;
      }

      // Already granted — ensure subscription is active and saved
      if (Notification.permission === 'granted') {
        console.log('[PushInit] Permission already granted, ensuring subscription...');
        const ok = await webPushService.initialize();
        if (ok) {
          if (!webPushService.isSubscribed()) {
            // Re-subscribe (subscription may have expired)
            await webPushService.requestPermissionAndSubscribe();
          } else {
            await webPushService.refreshSubscription();
          }
        }
        return;
      }

      // Permission is 'default' — need to ask
      const askedVersion = localStorage.getItem('auradesk-webpush-version');
      if (askedVersion === PUSH_PROMPT_VERSION) {
        console.log('[PushInit] Already prompted for this version');
        return;
      }

      // Pre-initialize to fetch VAPID key
      await webPushService.initialize();

      // Show prompt after user settles in
      timer = setTimeout(() => {
        localStorage.setItem('auradesk-webpush-version', PUSH_PROMPT_VERSION);

        toast('🔔 Enable Notifications', {
          description: 'Get alerts for incoming calls, messages, and updates — even when the app is closed.',
          duration: 60000,
          action: {
            label: 'Enable Now',
            onClick: async () => {
              const success = await webPushService.requestPermissionAndSubscribe();
              if (success) {
                toast.success('Notifications enabled! You\'ll get alerts for calls and messages.');
              } else {
                toast.error('Could not enable notifications. Check your browser settings.');
              }
            },
          },
        });
      }, 2000);
    };

    initWebPush();

    return () => {
      clearTimeout(timer);
    };
  }, [user, isNativeSupported]);

  return null;
};
