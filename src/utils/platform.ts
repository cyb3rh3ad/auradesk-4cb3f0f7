import { Capacitor } from '@capacitor/core';

/**
 * Check if running as a native Capacitor app (iOS/Android)
 */
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running in a web browser (not native app)
 */
export const isWebApp = (): boolean => {
  return !Capacitor.isNativePlatform();
};

/**
 * Get the current platform
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};
