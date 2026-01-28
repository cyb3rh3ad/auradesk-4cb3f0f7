import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, ScanFace, Loader2 } from 'lucide-react';
import { BiometryType } from '@/hooks/useBiometricAuth';
import { motion } from 'framer-motion';

interface BiometricLoginButtonProps {
  biometryType: BiometryType;
  biometryName: string;
  onPress: () => Promise<void>;
  disabled?: boolean;
}

export const BiometricLoginButton = ({
  biometryType,
  biometryName,
  onPress,
  disabled,
}: BiometricLoginButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

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

  const handlePress = async () => {
    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Button
        type="button"
        variant="outline"
        onClick={handlePress}
        disabled={disabled || isLoading}
        className="w-full h-11 gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5 text-primary" />
        )}
        {isLoading ? 'Verifying...' : `Sign in with ${biometryName}`}
      </Button>
    </motion.div>
  );
};
