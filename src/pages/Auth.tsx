import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import googleLogo from '@/assets/google-g-logo.png';
import auraLogo from '@/assets/auradesk-a-clean.png';
import { MfaVerification } from '@/components/auth/MfaVerification';
import { PasswordStrengthValidator, validatePassword } from '@/components/auth/PasswordStrengthValidator';
import { isElectronApp } from '@/hooks/useIsElectron';
import { Monitor, ArrowLeft } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { BiometricPromptDialog } from '@/components/auth/BiometricPromptDialog';
import { BiometricLoginButton } from '@/components/auth/BiometricLoginButton';

// Interactive Logo Component with chameleon circle
const InteractiveLogo = () => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <motion.button
      type="button"
      className="relative w-24 h-24 rounded-full overflow-visible cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.1), hsl(var(--muted) / 0.2))',
        boxShadow: isPressed 
          ? '0 0 30px hsl(var(--primary) / 0.4), inset 0 0 20px hsl(var(--primary) / 0.1)'
          : '0 0 20px hsl(var(--primary) / 0.2), inset 0 0 15px hsl(var(--primary) / 0.05)',
        border: '1px solid hsl(var(--primary) / 0.25)',
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* The logo */}
      <img 
        src={auraLogo} 
        alt="AuraDesk" 
        className="relative z-10 w-12 h-12 object-contain"
        style={{
          filter: `drop-shadow(0 0 ${isPressed ? '12px' : '8px'} hsl(var(--primary) / 0.5))`,
          mixBlendMode: 'screen',
        }}
      />
      
      {/* Subtle animated glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: '1px solid hsl(var(--primary) / 0.3)',
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.button>
  );
};

const Auth = () => {
  const { signUp, signIn, signInWithGoogle, mfaRequired, mfaFactorId, clearMfaState, completeMfaVerification, user, session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isElectron = isElectronApp();
  
  // Biometric authentication
  const {
    isNativeMobile,
    isAvailable: biometricAvailable,
    biometryType,
    biometryName,
    isEnabled: biometricEnabled,
    isChecking: biometricChecking,
    enableBiometric,
    verifyAndGetCredentials,
    shouldShowPrompt,
    markPromptShown,
  } = useBiometricAuth();
  
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  
  // If user is already authenticated (session + user), redirect to dashboard
  // This handles OAuth redirects that complete with full authentication
  useEffect(() => {
    if (!authLoading && user && session && !mfaRequired) {
      navigate('/dashboard');
    }
  }, [authLoading, user, session, mfaRequired, navigate]);
  
  // Listen for OAuth completion event from AuthContext (Electron deep link callback)
  useEffect(() => {
    const handleOAuthComplete = (event: CustomEvent<{ success: boolean }>) => {
      setGoogleLoading(false);
      if (event.detail.success) {
        toast({
          title: "Google sign-in successful",
          description: mfaRequired ? "Please complete 2FA verification." : "Welcome back!",
        });
      }
    };
    
    window.addEventListener('oauth-complete', handleOAuthComplete as EventListener);
    return () => window.removeEventListener('oauth-complete', handleOAuthComplete as EventListener);
  }, [mfaRequired, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(loginEmail, loginPassword);
  };
  
  // Core login function that can be called from form or biometric
  const performLogin = async (email: string, password: string, fromBiometric = false) => {
    setLoading(true);
    
    const result = await signIn(email, password, rememberMe);
    
    if (result.error) {
      toast({
        title: "Login failed",
        description: result.error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else if (result.mfaRequired) {
      // MFA required - the component will show MFA verification
      setLoading(false);
    } else {
      // Login successful - check if we should prompt for biometric
      if (!fromBiometric && shouldShowPrompt()) {
        setPendingCredentials({ email, password });
        setShowBiometricPrompt(true);
      } else {
        navigate('/dashboard');
      }
      setLoading(false);
    }
  };
  
  // Handle biometric login button press
  const handleBiometricLogin = async () => {
    const credentials = await verifyAndGetCredentials();
    if (credentials) {
      await performLogin(credentials.email, credentials.password, true);
    }
  };
  
  // Handle enabling biometric after first login
  const handleEnableBiometric = async () => {
    if (pendingCredentials) {
      const success = await enableBiometric(pendingCredentials.email, pendingCredentials.password);
      if (success) {
        setShowBiometricPrompt(false);
        setPendingCredentials(null);
        navigate('/dashboard');
      }
    }
  };
  
  // Handle skipping biometric prompt
  const handleSkipBiometric = () => {
    markPromptShown();
    setShowBiometricPrompt(false);
    setPendingCredentials(null);
    navigate('/dashboard');
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupUsername.match(/^[a-zA-Z0-9_]{3,20}$/)) {
      toast({
        title: 'Invalid username',
        description: 'Username must be 3-20 characters and contain only letters, numbers, and underscores.',
        variant: 'destructive',
      });
      return;
    }

    // Validate password strength
    const { isValid: isPasswordValid, requirements } = validatePassword(signupPassword);
    if (!isPasswordValid) {
      const unmetRequirements = requirements.filter(r => !r.met).map(r => r.label);
      toast({
        title: 'Password too weak',
        description: `Please fix: ${unmetRequirements.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupUsername);
    
    if (error) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Redirecting to your dashboard...",
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    // For Electron: Set up cleanup when OAuth completes (success or failure)
    // The oauth-complete event from AuthContext will reset googleLoading
    // We only timeout if no response is received at all (browser didn't open, etc.)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (isElectron) {
      timeoutId = setTimeout(() => {
        setGoogleLoading(false);
        toast({
          title: "Google sign-in timed out",
          description: "No response received. Please try again.",
          variant: "destructive",
        });
      }, 60000); // 60 second timeout - gives user plenty of time to complete OAuth
      
      // Clear timeout when oauth-complete is received
      const clearTimeoutOnComplete = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
      window.addEventListener('oauth-complete', clearTimeoutOnComplete, { once: true });
    }
    
    const { error } = await signInWithGoogle();
    
    if (error) {
      if (timeoutId) clearTimeout(timeoutId);
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive",
      });
      setGoogleLoading(false);
    } else if (isElectron) {
      // Show helpful message for Electron users
      toast({
        title: "Browser opened",
        description: "Complete sign-in in your browser. You'll be redirected automatically.",
      });
      // Loading will be reset by oauth-complete event or timeout
    } else {
      setGoogleLoading(false);
    }
  };

  const handleMfaSuccess = async () => {
    await completeMfaVerification();
    navigate('/dashboard');
  };

  const handleMfaCancel = async () => {
    await clearMfaState();
  };

  // Show MFA verification within the login card if required
  if (mfaRequired && mfaFactorId) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background ${isElectron ? 'pt-12' : ''}`}>
        {/* Electron title bar spacer */}
        {isElectron && <div className="absolute top-0 left-0 right-0 h-8 z-50" />}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
        
        <Card className="w-full max-w-md relative border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <InteractiveLogo />
            </div>
            <CardTitle className="text-3xl font-bold">Welcome to AuraDesk</CardTitle>
            <CardDescription>Enter your 2FA code to continue</CardDescription>
          </CardHeader>
          
          <CardContent>
            <MfaVerification
              factorId={mfaFactorId}
              onSuccess={handleMfaSuccess}
              onCancel={handleMfaCancel}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background ${isElectron ? 'pt-12' : ''}`}>
      {/* Electron title bar spacer - prevents content overlap with window controls */}
      {isElectron && <div className="absolute top-0 left-0 right-0 h-8 z-50" />}
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      
      {/* Back button for web only */}
      {!isElectron && (
        <div className="absolute top-4 left-4 z-10">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative"
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <InteractiveLogo />
            </div>
            <CardTitle className="text-3xl font-bold">Welcome to AuraDesk</CardTitle>
            
            {/* Desktop app indicator */}
            {isElectron && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Monitor className="h-4 w-4" />
                <span>Desktop App</span>
              </div>
            )}
            
            <CardDescription>Sign in to access your workspace</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={loading}
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                  
                  {/* Biometric login button - only on mobile when enabled */}
                  {isNativeMobile && biometricEnabled && !biometricChecking && (
                    <BiometricLoginButton
                      biometryType={biometryType}
                      biometryName={biometryName}
                      onPress={handleBiometricLogin}
                      disabled={loading}
                    />
                  )}
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="johndoe123"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                      disabled={loading}
                      pattern="[a-zA-Z0-9_]{3,20}"
                      title="3-20 characters: letters, numbers, and underscores only"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      3-20 characters: letters, numbers, and underscores only
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={8}
                      className="h-11"
                    />
                    <PasswordStrengthValidator password={signupPassword} />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11" 
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* Google Sign In - Hidden in Electron since OAuth doesn't work reliably */}
            {!isElectron && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full h-11 gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <img src={googleLogo} alt="Google" className="w-5 h-5" />
                  {googleLoading ? "Signing in..." : "Sign in with Google"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Version info for desktop */}
        {isElectron && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            AuraDesk Desktop v1.0.0
          </p>
        )}
      </motion.div>
      
      {/* Biometric prompt dialog - shown after first successful login on mobile */}
      <BiometricPromptDialog
        open={showBiometricPrompt}
        onOpenChange={setShowBiometricPrompt}
        biometryType={biometryType}
        biometryName={biometryName}
        onEnable={handleEnableBiometric}
        onSkip={handleSkipBiometric}
      />
    </div>
  );
};

export default Auth;
