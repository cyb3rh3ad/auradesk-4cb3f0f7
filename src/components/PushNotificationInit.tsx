import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { webPushService } from '@/services/webPushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Component that initializes push notifications on all platforms.
 * - Native: Uses Capacitor FCM
 * - Web/PWA: Uses Web Push API with VAPID
 * 
 * Notification permission covers everything: messages, calls, updates.
 * Call-specific handling (ringtone, vibration) is done in the service worker
 * and native push handler.
 */
export const PushNotificationInit = () => {
  const { isSupported: isNativeSupported, isInitialized: isNativeInit } = usePushNotifications();
  const { user } = useAuth();
  const [hasAskedPermission, setHasAskedPermission] = useState(false);

  // Native push notification log
  useEffect(() => {
    if (isNativeSupported && isNativeInit) {
      console.log('Native push notifications ready (messages + calls)');
    }
  }, [isNativeSupported, isNativeInit]);

  // Web push initialization
  useEffect(() => {
    if (!user || isNativeSupported) return;

    const initWebPush = async () => {
      const supported = webPushService.isSupported();
      if (!supported) {
        console.log('Web Push not supported in this browser');
        return;
      }

      const initialized = await webPushService.initialize();
      if (!initialized) return;

      // If already subscribed, we're done
      if (webPushService.isSubscribed()) {
        console.log('Web push already subscribed (messages + calls)');
        return;
      }

      // If permission already granted, auto-subscribe
      if (Notification.permission === 'granted') {
        await webPushService.requestPermissionAndSubscribe();
        return;
      }

      // Check if we've already asked (avoid nagging)
      const asked = localStorage.getItem('auradesk-webpush-asked');
      if (asked) return;

      // Wait a bit before asking
      const timer = setTimeout(() => {
        if (!hasAskedPermission) {
          setHasAskedPermission(true);
          localStorage.setItem('auradesk-webpush-asked', 'true');
          
          toast('🔔 Enable notifications?', {
            description: 'Get notified about incoming calls, messages, and updates — even when the app is in the background.',
            duration: 20000,
            action: {
              label: 'Enable',
              onClick: async () => {
                const success = await webPushService.requestPermissionAndSubscribe();
                if (success) {
                  toast.success('Notifications enabled! You\'ll receive call and message alerts.');
                } else {
                  toast.error('Could not enable notifications. Check your browser settings.');
                }
              },
            },
          });
        }
      }, 5000);

      return () => clearTimeout(timer);
    };

    initWebPush();
  }, [user, isNativeSupported]);

  return null;
};
