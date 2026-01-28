import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Fingerprint, ScanFace, Smartphone, AlertCircle } from 'lucide-react';
import { useBiometricAuth, BiometryType } from '@/hooks/useBiometricAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export const BiometricSettings = () => {
  const {
    isNativeMobile,
    isAvailable,
    biometryType,
    biometryName,
    isEnabled,
    isChecking,
    enableBiometric,
    disableBiometric,
  } = useBiometricAuth();
  
  const { toast } = useToast();
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Don't render anything if not on native mobile platform
  // This ensures the component is completely hidden on web and desktop
  if (!isNativeMobile) {
    return null;
  }

  // Also check window to prevent SSR issues
  if (typeof window === 'undefined') {
    return null;
  }

  // Show loading state
  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Biometric Login
          </CardTitle>
          <CardDescription>Checking biometric availability...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Biometrics not available on this device
  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Biometric Login
          </CardTitle>
          <CardDescription>
            Use fingerprint or face recognition to quickly unlock the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Biometric authentication is not available on this device. Make sure you have 
              fingerprint or face recognition set up in your device settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getBiometricIcon = () => {
    switch (biometryType) {
      case BiometryType.FACE_ID:
      case BiometryType.FACE_AUTHENTICATION:
        return <ScanFace className="w-5 h-5" />;
      case BiometryType.TOUCH_ID:
      case BiometryType.FINGERPRINT:
      default:
        return <Fingerprint className="w-5 h-5" />;
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Show dialog to enter credentials
      setShowEnableDialog(true);
    } else {
      // Disable biometric
      setIsLoading(true);
      await disableBiometric();
      setIsLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    if (!email || !password) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter your email and password.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const success = await enableBiometric(email, password);
    setIsLoading(false);

    if (success) {
      setShowEnableDialog(false);
      setEmail('');
      setPassword('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getBiometricIcon()}
            {biometryName} Login
          </CardTitle>
          <CardDescription>
            Use {biometryName.toLowerCase()} to quickly unlock the app without entering your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Enable {biometryName}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isEnabled 
                  ? `${biometryName} is enabled for quick unlock`
                  : 'Securely store your credentials on this device'
                }
              </p>
            </div>
            <Switch 
              checked={isEnabled} 
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>

          {isEnabled && (
            <Alert className="bg-primary/5 border-primary/20">
              <Fingerprint className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                Your credentials are stored securely on this device and protected by {biometryName}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enable Biometric Dialog */}
      <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getBiometricIcon()}
              Enable {biometryName}
            </DialogTitle>
            <DialogDescription>
              Enter your login credentials to securely store them. You'll use {biometryName.toLowerCase()} to unlock them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bio-email">Email</Label>
              <Input
                id="bio-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio-password">Password</Label>
              <Input
                id="bio-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleEnableBiometric}
              disabled={isLoading || !email || !password}
              className="w-full"
            >
              {isLoading ? 'Enabling...' : `Enable ${biometryName}`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowEnableDialog(false);
                setEmail('');
                setPassword('');
              }}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
