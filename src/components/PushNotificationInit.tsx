import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { webPushService } from '@/services/webPushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Component that initializes push notifications on all platforms.
 * - Native: Uses Capacitor FCM
 * - Web/PWA: Uses Web Push API with VAPID
 * Should be placed inside AuthProvider and ProtectedRoute.
 */
export const PushNotificationInit = () => {
  const { isSupported: isNativeSupported, isInitialized: isNativeInit } = usePushNotifications();
  const { user } = useAuth();
  const [webPushReady, setWebPushReady] = useState(false);
  const [hasAskedPermission, setHasAskedPermission] = useState(false);

  // Native push notification log
  useEffect(() => {
    if (isNativeSupported && isNativeInit) {
      console.log('Native push notifications ready');
    }
  }, [isNativeSupported, isNativeInit]);

  // Web push initialization
  useEffect(() => {
    if (!user || isNativeSupported) return; // Skip web push on native platforms

    const initWebPush = async () => {
      const supported = webPushService.isSupported();
      if (!supported) {
        console.log('Web Push not supported in this browser');
        return;
      }

      const initialized = await webPushService.initialize();
      if (!initialized) return;

      setWebPushReady(true);

      // If already subscribed, we're done
      if (webPushService.isSubscribed()) {
        console.log('Web push already subscribed');
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

      // Wait a bit before asking, so the user has time to settle in
      const timer = setTimeout(() => {
        if (!hasAskedPermission) {
          setHasAskedPermission(true);
          localStorage.setItem('auradesk-webpush-asked', 'true');
          
          toast('🔔 Enable notifications?', {
            description: 'Get notified about messages, calls, and updates even when the app is in the background.',
            duration: 15000,
            action: {
              label: 'Enable',
              onClick: async () => {
                const success = await webPushService.requestPermissionAndSubscribe();
                if (success) {
                  toast.success('Notifications enabled!');
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
