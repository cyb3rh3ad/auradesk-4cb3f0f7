import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Component that initializes push notifications on native platforms.
 * Should be placed inside AuthProvider and ProtectedRoute.
 */
export const PushNotificationInit = () => {
  const { isSupported, isInitialized } = usePushNotifications();

  useEffect(() => {
    if (isSupported && isInitialized) {
      console.log('Push notifications ready');
    }
  }, [isSupported, isInitialized]);

  // This component doesn't render anything
  return null;
};
