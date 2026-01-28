import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Types for capacitor-native-biometric
interface NativeBiometric {
  isAvailable(): Promise<{ isAvailable: boolean; biometryType: number; errorCode?: number }>;
  verifyIdentity(options: { reason?: string; title?: string; subtitle?: string; description?: string }): Promise<void>;
  setCredentials(options: { username: string; password: string; server: string }): Promise<void>;
  getCredentials(options: { server: string }): Promise<{ username: string; password: string }>;
  deleteCredentials(options: { server: string }): Promise<void>;
}

// Biometry types
export enum BiometryType {
  NONE = 0,
  TOUCH_ID = 1,
  FACE_ID = 2,
  FINGERPRINT = 3,
  FACE_AUTHENTICATION = 4,
  IRIS_AUTHENTICATION = 5,
  MULTIPLE = 6,
}

const SERVER_IDENTIFIER = 'app.auradesk.biometric';
const BIOMETRIC_ENABLED_KEY = 'auradesk_biometric_enabled';
const BIOMETRIC_PROMPT_SHOWN_KEY = 'auradesk_biometric_prompt_shown';

// Check if running on native mobile (not Electron, not web)
const isNativeMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Explicitly check for Capacitor native platform
  const capacitor = (window as any).Capacitor;
  if (!capacitor) return false;
  
  // Must be native platform (not web)
  const isNative = typeof capacitor.isNativePlatform === 'function' 
    ? capacitor.isNativePlatform() 
    : false;
  
  // Double-check we're not in Electron
  const isElectron = !!(window as any).electronAPI?.isElectron || 
    window.location.protocol === 'file:' ||
    navigator.userAgent.toLowerCase().includes('electron');
  
  return isNative && !isElectron;
};

// Get the NativeBiometric plugin safely
const getNativeBiometric = async (): Promise<NativeBiometric | null> => {
  if (!isNativeMobile()) return null;
  
  try {
    // Dynamic import with error boundary
    const module = await import('capacitor-native-biometric');
    if (!module || !module.NativeBiometric) {
      console.warn('NativeBiometric module not available');
      return null;
    }
    return module.NativeBiometric as NativeBiometric;
  } catch (e) {
    // Silently fail on non-mobile platforms
    console.warn('NativeBiometric not available on this platform:', e);
    return null;
  }
};

export const useBiometricAuth = () => {
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType>(BiometryType.NONE);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasPromptBeenShown, setHasPromptBeenShown] = useState(false);

  // Get human-readable biometry type name
  const getBiometryName = useCallback((): string => {
    switch (biometryType) {
      case BiometryType.TOUCH_ID:
        return 'Touch ID';
      case BiometryType.FACE_ID:
        return 'Face ID';
      case BiometryType.FINGERPRINT:
        return 'Fingerprint';
      case BiometryType.FACE_AUTHENTICATION:
        return 'Face Authentication';
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Iris Authentication';
      case BiometryType.MULTIPLE:
        return 'Biometric';
      default:
        return 'Biometric';
    }
  }, [biometryType]);

  // Check biometric availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      if (!isNativeMobile()) {
        setIsChecking(false);
        return;
      }

      try {
        const biometric = await getNativeBiometric();
        if (!biometric) {
          setIsChecking(false);
          return;
        }

        const result = await biometric.isAvailable();
        setIsAvailable(result.isAvailable);
        setBiometryType(result.biometryType || BiometryType.NONE);
        
        // Check if biometric is enabled in local storage
        const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
        setIsEnabled(enabled);
        
        // Check if prompt has been shown
        const promptShown = localStorage.getItem(BIOMETRIC_PROMPT_SHOWN_KEY) === 'true';
        setHasPromptBeenShown(promptShown);
      } catch (e) {
        console.error('Biometric availability check failed:', e);
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAvailability();
  }, []);

  // Enable biometric authentication - stores credentials securely
  const enableBiometric = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!isNativeMobile()) return false;

    try {
      const biometric = await getNativeBiometric();
      if (!biometric) return false;

      // Verify biometric first
      await biometric.verifyIdentity({
        reason: 'Confirm your identity to enable biometric login',
        title: 'Enable Biometric Login',
        subtitle: `Use ${getBiometryName()} to sign in`,
      });

      // Store credentials securely
      await biometric.setCredentials({
        username: email,
        password: password,
        server: SERVER_IDENTIFIER,
      });

      localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      
      toast({
        title: `${getBiometryName()} enabled`,
        description: 'You can now use biometric login to unlock the app.',
      });

      return true;
    } catch (e: any) {
      console.error('Failed to enable biometric:', e);
      toast({
        title: 'Failed to enable biometric',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [getBiometryName, toast]);

  // Disable biometric authentication
  const disableBiometric = useCallback(async (): Promise<boolean> => {
    if (!isNativeMobile()) return false;

    try {
      const biometric = await getNativeBiometric();
      if (!biometric) return false;

      await biometric.deleteCredentials({ server: SERVER_IDENTIFIER });
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);

      toast({
        title: 'Biometric disabled',
        description: 'You will need to enter your password to sign in.',
      });

      return true;
    } catch (e: any) {
      console.error('Failed to disable biometric:', e);
      return false;
    }
  }, [toast]);

  // Verify biometric and get stored credentials
  const verifyAndGetCredentials = useCallback(async (): Promise<{ email: string; password: string } | null> => {
    if (!isNativeMobile() || !isEnabled) return null;

    try {
      const biometric = await getNativeBiometric();
      if (!biometric) return null;

      // Verify identity
      await biometric.verifyIdentity({
        reason: 'Sign in to AuraDesk',
        title: 'Welcome Back',
        subtitle: `Use ${getBiometryName()} to sign in`,
      });

      // Get stored credentials
      const credentials = await biometric.getCredentials({ server: SERVER_IDENTIFIER });
      
      return {
        email: credentials.username,
        password: credentials.password,
      };
    } catch (e: any) {
      console.error('Biometric verification failed:', e);
      // Don't show error for user cancellation
      if (e?.code !== 10 && e?.code !== 'userCancel') {
        toast({
          title: 'Biometric verification failed',
          description: 'Please sign in with your password.',
          variant: 'destructive',
        });
      }
      return null;
    }
  }, [isEnabled, getBiometryName, toast]);

  // Mark the prompt as shown
  const markPromptShown = useCallback(() => {
    localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, 'true');
    setHasPromptBeenShown(true);
  }, []);

  // Check if we should show the biometric prompt
  const shouldShowPrompt = useCallback((): boolean => {
    return isNativeMobile() && isAvailable && !isEnabled && !hasPromptBeenShown;
  }, [isAvailable, isEnabled, hasPromptBeenShown]);

  return {
    isNativeMobile: isNativeMobile(),
    isAvailable,
    biometryType,
    biometryName: getBiometryName(),
    isEnabled,
    isChecking,
    enableBiometric,
    disableBiometric,
    verifyAndGetCredentials,
    shouldShowPrompt,
    markPromptShown,
  };
};
