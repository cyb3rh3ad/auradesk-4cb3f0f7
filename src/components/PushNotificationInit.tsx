import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { webPushService } from '@/services/webPushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Single unified push notification initializer.
 * One permission covers everything: messages, calls, updates.
 * Shows ONE prompt, never nags.
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

      // Already asked before — don't nag
      if (localStorage.getItem('auradesk-webpush-asked')) return;

      // Show ONE prompt after a delay
      timer = setTimeout(() => {
        if (cancelled) return;
        setPrompted(true);
        localStorage.setItem('auradesk-webpush-asked', 'true');

        toast('🔔 Stay in the loop', {
          description: 'Enable notifications to get alerts for calls, messages, and updates — even when the app is closed.',
          duration: 15000,
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
      }, 8000); // Wait 8s so user has time to settle in
    };

    initWebPush();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, isNativeSupported, prompted]);

  return null;
};
