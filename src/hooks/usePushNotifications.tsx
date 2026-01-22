import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pushNotificationService } from '@/services/pushNotifications';
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    setIsSupported(isNative);

    if (isNative && user) {
      // Initialize push notifications when user is logged in
      pushNotificationService.initialize().then(() => {
        setIsInitialized(pushNotificationService.isInitialized());
        setToken(pushNotificationService.getToken());
      });
    }

    return () => {
      // Cleanup on unmount if needed
    };
  }, [user]);

  const removeToken = async () => {
    await pushNotificationService.removeToken();
    setToken(null);
  };

  return {
    isSupported,
    isInitialized,
    token,
    removeToken,
  };
};
