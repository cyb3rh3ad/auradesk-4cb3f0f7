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

    if (isNative) {
      // Initialize push notifications regardless of login state
      // This ensures we get a token stored locally
      pushNotificationService.initialize().then(async () => {
        setIsInitialized(pushNotificationService.isInitialized());
        setToken(pushNotificationService.getToken());
        
        // If user is logged in, associate any stored token
        if (user) {
          await pushNotificationService.associateStoredToken();
          setToken(pushNotificationService.getToken());
        }
      });
    }

    return () => {
      // Cleanup on unmount if needed
    };
  }, [user]);

  // Re-associate token when user logs in
  useEffect(() => {
    if (user && isInitialized) {
      pushNotificationService.associateStoredToken().then(() => {
        setToken(pushNotificationService.getToken());
      });
    }
  }, [user, isInitialized]);

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
