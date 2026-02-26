import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { webPushService } from '@/services/webPushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Bump this version to force re-prompt all users
const PUSH_PROMPT_VERSION = '2';

/**
 * Single unified push notification initializer.
 * One permission covers everything: messages, calls, updates.
 * Shows ONE prompt per version, never nags.
 */
export const PushNotificationInit = () => {
  const { isSupported: isNativeSupported, isInitialized: isNativeInit } = usePushNotifications();
  const { user } = useAuth();
  const [prompted, setPrompted] = useState(false);

  useEffect(() => {
    if (!user || isNativeSupported || prompted) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const initWebPush = async () => {
      const supported = webPushService.isSupported();
      if (!supported) return;

      const initialized = await webPushService.initialize();
      if (!initialized || cancelled) return;

      // Already subscribed — nothing to do
      if (webPushService.isSubscribed()) return;

      // Permission already granted — silently subscribe
      if (Notification.permission === 'granted') {
        await webPushService.requestPermissionAndSubscribe();
        return;
      }

      // Permission denied — can't do anything (user must change in browser settings)
      if (Notification.permission === 'denied') return;

      // Check if we already prompted for this version
      const askedVersion = localStorage.getItem('auradesk-webpush-version');
      if (askedVersion === PUSH_PROMPT_VERSION) return;

      // Show ONE prompt after a delay
      timer = setTimeout(() => {
        if (cancelled) return;
        setPrompted(true);
        localStorage.setItem('auradesk-webpush-version', PUSH_PROMPT_VERSION);

        toast('🔔 Stay in the loop', {
          description: 'Enable notifications to get alerts for calls, messages, and updates — even when the app is closed.',
          duration: 20000,
          action: {
            label: 'Enable',
            onClick: async () => {
              const success = await webPushService.requestPermissionAndSubscribe();
              if (success) {
                toast.success('You\'re all set! You\'ll get alerts for calls and messages.');
              }
            },
          },
        });
      }, 5000);
    };

    initWebPush();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, isNativeSupported, prompted]);

  return null;
};
