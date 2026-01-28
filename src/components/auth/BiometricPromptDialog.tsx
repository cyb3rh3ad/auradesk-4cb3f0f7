import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, ScanFace, Shield } from 'lucide-react';
import { BiometryType } from '@/hooks/useBiometricAuth';
import { motion } from 'framer-motion';

// Safety check for platform
const canShowBiometric = (): boolean => {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as any).Capacitor;
  const isNative = capacitor?.isNativePlatform?.() ?? false;
  const isElectron = !!(window as any).electronAPI?.isElectron;
  return isNative && !isElectron;
};

interface BiometricPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biometryType: BiometryType;
  biometryName: string;
  onEnable: () => Promise<void>;
  onSkip: () => void;
}

export const BiometricPromptDialog = ({
  open,
  onOpenChange,
  biometryType,
  biometryName,
  onEnable,
  onSkip,
}: BiometricPromptDialogProps) => {
  const [isEnabling, setIsEnabling] = useState(false);

  const getBiometricIcon = () => {
    switch (biometryType) {
      case BiometryType.FACE_ID:
      case BiometryType.FACE_AUTHENTICATION:
        return ScanFace;
      case BiometryType.TOUCH_ID:
      case BiometryType.FINGERPRINT:
      default:
        return Fingerprint;
    }
  };

  const Icon = getBiometricIcon();

  const handleEnable = useCallback(async () => {
    if (!canShowBiometric()) {
      onOpenChange(false);
      return;
    }
    
    setIsEnabling(true);
    try {
      await onEnable();
    } catch (e) {
      console.warn('Failed to enable biometric:', e);
    } finally {
      setIsEnabling(false);
    }
  }, [onEnable, onOpenChange]);

  const handleSkip = useCallback(() => {
    onSkip();
    onOpenChange(false);
  }, [onSkip, onOpenChange]);

  // Don't render dialog on non-native platforms
  if (!canShowBiometric()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: 'spring' }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Icon className="w-10 h-10 text-primary" />
              </div>
              <motion.div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <Shield className="w-4 h-4 text-white" />
              </motion.div>
            </motion.div>
          </div>
          <DialogTitle className="text-xl">Enable {biometryName}?</DialogTitle>
          <DialogDescription className="text-center">
            Unlock AuraDesk quickly and securely with {biometryName}. 
            Your credentials are stored safely on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Quick access</p>
              <p className="text-xs text-muted-foreground">
                Sign in with just a touch or a glance
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Secure & private</p>
              <p className="text-xs text-muted-foreground">
                Your biometric data never leaves your device
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleEnable}
            disabled={isEnabling}
            className="w-full"
          >
            {isEnabling ? 'Enabling...' : `Enable ${biometryName}`}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isEnabling}
            className="w-full"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
