import { useState, useEffect } from 'react';
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
import auraLogo from '@/assets/auradesk-logo.png';
import { MfaVerification } from '@/components/auth/MfaVerification';
import { PasswordStrengthValidator, validatePassword } from '@/components/auth/PasswordStrengthValidator';
import { isElectronApp } from '@/hooks/useIsElectron';
import { Monitor, ArrowLeft, ExternalLink } from 'lucide-react';

// Interactive Logo Component with creative effects
const InteractiveLogo = () => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sparkCount, setSparkCount] = useState(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, newRipple]);
    setSparkCount(prev => prev + 1);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <motion.button
      type="button"
      className="relative w-20 h-20 rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        boxShadow: isPressed 
          ? '0 0 30px hsl(262 83% 58% / 0.6), 0 0 60px hsl(262 83% 58% / 0.3), inset 0 0 20px hsl(262 83% 58% / 0.2)'
          : '0 10px 30px hsl(262 83% 58% / 0.3), 0 0 0px hsl(262 83% 58% / 0)'
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-500" />
      
      {/* Logo */}
      <img 
        src={auraLogo} 
        alt="AuraDesk" 
        className="relative z-10 w-full h-full object-cover rounded-2xl"
      />
      
      {/* Hover glow overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Click ripples */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/40 pointer-events-none"
          style={{ left: ripple.x, top: ripple.y }}
          initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 1 }}
          animate={{ width: 160, height: 160, x: -80, y: -80, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
      
      {/* Sparkle particles on click */}
      {sparkCount > 0 && Array.from({ length: 6 }).map((_, i) => (
        <motion.span
          key={`${sparkCount}-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300 pointer-events-none"
          style={{ left: '50%', top: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ 
            x: Math.cos((i / 6) * Math.PI * 2) * 50, 
            y: Math.sin((i / 6) * Math.PI * 2) * 50, 
            opacity: 0,
            scale: 0
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
    setLoading(true);
    
    const result = await signIn(loginEmail, loginPassword, rememberMe);
    
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
      navigate('/dashboard');
      setLoading(false);
    }
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
      
      {/* Back button for web only - positioned above card on mobile */}
      {!isElectron && (
        <div className="w-full max-w-md mb-2 sm:absolute sm:top-4 sm:left-4 sm:w-auto sm:mb-0 sm:z-10">
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
        className="w-full max-w-md relative z-20"
      >
        <Card className="border-border/50 bg-card shadow-2xl">
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
                    className="w-full h-11 bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:from-violet-500 hover:via-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25" 
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
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
                    className="w-full h-11 bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:from-violet-500 hover:via-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25" 
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
    </div>
  );
};

export default Auth;
