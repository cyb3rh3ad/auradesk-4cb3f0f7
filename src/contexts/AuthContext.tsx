import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<{ error: any; mfaRequired?: boolean; factorId?: string }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  mfaRequired: boolean;
  mfaFactorId: string | null;
  clearMfaState: () => Promise<void>;
  completeMfaVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if running as native mobile app (Capacitor)
const isNativeMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as any).Capacitor;
  return capacitor?.isNativePlatform?.() ?? false;
};

// Check if running as standalone PWA (Add to Home Screen)
const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Check if on a custom domain (not lovable.app or lovableproject.com)
const isCustomDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return !hostname.includes('lovable.app') && 
         !hostname.includes('lovableproject.com') &&
         hostname !== 'localhost';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Core MFA check function - returns true if MFA is required but not verified
  const checkAndHandleMfa = async (currentSession: Session): Promise<boolean> => {
    try {
      // First check if user has any verified TOTP factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');
      
      if (!verifiedFactor) {
        // No MFA configured - allow access
        console.log('MFA check: No verified TOTP factors found');
        return false;
      }

      // User has MFA configured - check current AAL level
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      console.log('MFA check: AAL level', aal.data?.currentLevel, 'next level', aal.data?.nextLevel);
      
      // MFA is required if we're at aal1 and user has verified factors
      if (aal.data?.currentLevel === 'aal1') {
        // MFA required but not verified - BLOCK access
        console.log('MFA check: MFA required, blocking access until verified');
        setMfaRequired(true);
        setMfaFactorId(verifiedFactor.id);
        return true;
      }
      
      // User has completed MFA (aal2) - allow access
      console.log('MFA check: AAL2 verified, allowing access');
      return false;
    } catch (err) {
      console.error('MFA check failed:', err);
      // On error, be safe and require MFA if factors exist
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Track if this is a fresh OAuth login - set BEFORE redirect clears URL params
    // We check sessionStorage because the URL params are cleared after OAuth redirect processing
    const checkIsOAuthLogin = () => {
      const hasOAuthParams = window.location.hash.includes('access_token') || 
                             window.location.hash.includes('refresh_token') ||
                             window.location.search.includes('code=');
      
      if (hasOAuthParams) {
        // Mark this as a fresh OAuth login
        sessionStorage.setItem('oauth_login_pending', 'true');
        return true;
      }
      
      // Check if we recently came from OAuth
      const pending = sessionStorage.getItem('oauth_login_pending');
      return pending === 'true';
    };

    const initializeAuth = async () => {
      try {
        const isOAuthLogin = checkIsOAuthLogin();
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!currentSession) {
          sessionStorage.removeItem('oauth_login_pending');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Session exists - ALWAYS check MFA before allowing access
        const mfaNeeded = await checkAndHandleMfa(currentSession);
        
        if (!mounted) return;

        if (mfaNeeded) {
          if (isOAuthLogin) {
            // Fresh OAuth login - show MFA screen (don't sign out)
            // mfaRequired and mfaFactorId are already set by checkAndHandleMfa
            // Keep oauth_login_pending until MFA is completed
            setSession(null);
            setUser(null);
            setLoading(false);
          } else {
            // Stale session from another tab - sign out completely to force fresh login
            sessionStorage.removeItem('oauth_login_pending');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setMfaRequired(false);
            setMfaFactorId(null);
            setLoading(false);
          }
        } else {
          // MFA verified or not required - allow access
          sessionStorage.removeItem('oauth_login_pending');
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (mounted) {
          sessionStorage.removeItem('oauth_login_pending');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth state change:', event);

        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('oauth_login_pending');
          setSession(null);
          setUser(null);
          setMfaRequired(false);
          setMfaFactorId(null);
          setLoading(false);
          return;
        }

        // Skip INITIAL_SESSION as we handle it in initializeAuth
        if (event === 'INITIAL_SESSION') {
          return;
        }

        if (!newSession) {
          sessionStorage.removeItem('oauth_login_pending');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // For SIGNED_IN events, mark as OAuth login (this is a fresh login)
        if (event === 'SIGNED_IN') {
          sessionStorage.setItem('oauth_login_pending', 'true');
        }

        // For SIGNED_IN and TOKEN_REFRESHED, check MFA
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          if (!mounted) return;

          const mfaNeeded = await checkAndHandleMfa(newSession);
          
          if (!mounted) return;

          if (mfaNeeded) {
            // Keep oauth_login_pending - this is a fresh login requiring MFA
            setSession(null);
            setUser(null);
            setLoading(false);
          } else {
            sessionStorage.removeItem('oauth_login_pending');
            setSession(newSession);
            setUser(newSession.user);
            setLoading(false);
          }
        }, 0);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Get redirect URL that works for both web and Electron
  const getRedirectUrl = () => {
    // In Electron (file:// protocol), we can't use OAuth redirects properly
    // So we use the deployed web URL instead
    const isElectron = typeof window !== 'undefined' && 
      (window.location.protocol === 'file:' || (window as any).electronAPI?.isElectron);
    
    if (isElectron) {
      // For Electron, OAuth won't work - return null to skip redirects
      return null;
    }
    
    return `${window.location.origin}/#/dashboard`;
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    const redirectUrl = getRedirectUrl();
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(redirectUrl && { emailRedirectTo: redirectUrl }),
        data: {
          full_name: fullName,
          username: username,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error };
    }
    
    // Check if MFA is required after login
    if (data?.session) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');
      
      if (verifiedFactor) {
        // MFA is enabled - don't set session yet, require verification
        setMfaRequired(true);
        setMfaFactorId(verifiedFactor.id);
        return { error: null, mfaRequired: true, factorId: verifiedFactor.id };
      }
    }
    
    if (!error && rememberMe) {
      localStorage.setItem('aura_remember_me', 'true');
    }
    
    return { error };
  };

  const signInWithGoogle = async () => {
    // Check if we're in Electron
    const isElectron = typeof window !== 'undefined' && 
      (window as any).electronAPI?.isElectron;
    
    // Check if we're on native mobile (Capacitor)
    const isNative = isNativeMobile();
    
    // Check if we're in standalone PWA mode or on a custom domain
    const isPWA = isStandalonePWA();
    const isCustom = isCustomDomain();
    
    console.log('OAuth context:', { isElectron, isNative, isPWA, isCustom });
    
    if (isElectron) {
      // For Electron: Use custom protocol redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'auradesk://auth',
          skipBrowserRedirect: true,
        }
      });
      
      if (error) {
        return { error };
      }
      
      if (data?.url) {
        // Open the OAuth URL in the system's default browser
        if ((window as any).electronAPI?.openExternal) {
          (window as any).electronAPI.openExternal(data.url);
        } else {
          window.open(data.url, '_blank');
        }
      }
      
      return { error: null };
    }
    
    if (isNative) {
      // For native mobile apps: Use deep link redirect with in-app browser
      // The redirect URL uses the app's custom URL scheme
      const redirectUrl = 'app.auradesk.mobile://auth-callback';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        }
      });
      
      if (error) {
        console.error('OAuth initiation error:', error);
        return { error };
      }
      
      if (data?.url) {
        try {
          // Mark OAuth as pending before opening browser
          sessionStorage.setItem('oauth_login_pending', 'true');
          
          // Open OAuth URL in system browser (better compatibility than in-app browser)
          // System browser has better cookie handling for OAuth
          await Browser.open({ 
            url: data.url,
            presentationStyle: 'popover',
            windowName: '_blank',
          });
          
          console.log('Opened OAuth URL in browser:', data.url);
        } catch (browserError) {
          console.error('Failed to open browser:', browserError);
          // Fallback to window.open
          window.open(data.url, '_blank');
        }
      }
      
      return { error: null };
    }
    
    // For PWA standalone mode or custom domains: Use skipBrowserRedirect to bypass auth-bridge
    // This prevents the OAuth flow from getting stuck in a redirect loop
    if (isPWA || isCustom) {
      console.log('Using PWA/custom domain OAuth flow with skipBrowserRedirect');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/#/auth`,
          skipBrowserRedirect: true, // Critical: bypass auth-bridge
        }
      });
      
      if (error) {
        console.error('OAuth initiation error:', error);
        return { error };
      }
      
      if (data?.url) {
        // Validate OAuth URL before redirect (security: prevent open redirect)
        try {
          const oauthUrl = new URL(data.url);
          const allowedHosts = [
            'accounts.google.com',
            'www.googleapis.com',
            // Supabase auth endpoints
            'jtbxuiyhuyvqvdkqqioo.supabase.co',
          ];
          
          const isAllowedHost = allowedHosts.some(host => 
            oauthUrl.hostname === host || oauthUrl.hostname.endsWith('.supabase.co')
          );
          
          if (!isAllowedHost) {
            console.error('Invalid OAuth redirect URL:', oauthUrl.hostname);
            return { error: new Error('Invalid OAuth redirect URL') };
          }
          
          // Mark OAuth as pending before redirect
          sessionStorage.setItem('oauth_login_pending', 'true');
          
          // For PWA: Use location.replace to stay in same window context
          // This helps maintain the PWA standalone mode after OAuth completes
          console.log('Redirecting to OAuth URL:', data.url);
          window.location.href = data.url;
          
        } catch (urlError) {
          console.error('Failed to parse OAuth URL:', urlError);
          return { error: new Error('Invalid OAuth URL format') };
        }
      }
      
      return { error: null };
    }
    
    // Standard web: Normal OAuth flow - redirect to auth page for MFA check
    sessionStorage.setItem('oauth_login_pending', 'true');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/#/auth`,
      }
    });
    return { error };
  };

  // Handle deep link OAuth callback from Capacitor app
  const handleDeepLink = useCallback(async (url: string) => {
    console.log('Deep link received:', url);
    
    // Parse the URL to extract tokens
    // Expected format: app.auradesk.mobile://auth-callback#access_token=xxx&refresh_token=yyy
    // or: app.auradesk.mobile://auth-callback?code=xxx
    
    try {
      // Handle hash fragment tokens (implicit flow)
      if (url.includes('access_token=')) {
        const hashPart = url.split('#')[1] || url.split('?')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            console.log('Setting session from deep link tokens');
            
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Failed to set session from deep link:', error);
              window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: false } }));
              return;
            }
            
            // Close the browser after successful auth
            try {
              await Browser.close();
            } catch (e) {
              // Browser might already be closed
            }
            
            if (data.session) {
              const mfaNeeded = await checkAndHandleMfa(data.session);
              
              if (mfaNeeded) {
                setSession(null);
                setUser(null);
              } else {
                sessionStorage.removeItem('oauth_login_pending');
                setSession(data.session);
                setUser(data.session.user);
                navigate('/dashboard');
              }
            }
            
            window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: true } }));
          }
        }
      }
      
      // Handle authorization code flow
      if (url.includes('code=')) {
        const urlPart = url.split('?')[1] || url.split('#')[1];
        if (urlPart) {
          const params = new URLSearchParams(urlPart);
          const code = params.get('code');
          
          if (code) {
            console.log('Exchanging auth code for session');
            
            // Exchange the code for a session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('Failed to exchange code for session:', error);
              window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: false } }));
              return;
            }
            
            // Close the browser after successful auth
            try {
              await Browser.close();
            } catch (e) {
              // Browser might already be closed
            }
            
            if (data.session) {
              const mfaNeeded = await checkAndHandleMfa(data.session);
              
              if (mfaNeeded) {
                setSession(null);
                setUser(null);
              } else {
                sessionStorage.removeItem('oauth_login_pending');
                setSession(data.session);
                setUser(data.session.user);
                navigate('/dashboard');
              }
            }
            
            window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: true } }));
          }
        }
      }
    } catch (err) {
      console.error('Error handling deep link:', err);
      window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: false } }));
    }
  }, [navigate]);

  // Set up deep link listener for Capacitor
  useEffect(() => {
    if (!isNativeMobile()) return;
    
    console.log('Setting up Capacitor deep link listener');
    
    // Listen for deep links when app is open
    const unsubscribe = CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('App URL opened:', event.url);
      if (event.url.includes('auth-callback')) {
        handleDeepLink(event.url);
      }
    });
    
    return () => {
      unsubscribe.then(handle => handle.remove());
    };
  }, [handleDeepLink]);

  // Listen for OAuth callback from Electron deep link
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_CALLBACK') {
        const { accessToken, refreshToken } = event.data;
        
        if (accessToken && refreshToken) {
          try {
            // Mark as OAuth login for MFA handling
            sessionStorage.setItem('oauth_login_pending', 'true');
            
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Failed to set session from OAuth callback:', error);
              // Dispatch event to notify Auth.tsx to reset loading state
              window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: false } }));
              return;
            }
            
            // Session set successfully - check if MFA is required
            if (data.session) {
              const mfaNeeded = await checkAndHandleMfa(data.session);
              
              if (mfaNeeded) {
                // MFA required - mfaRequired and mfaFactorId are already set
                // Keep user/session null until MFA is verified
                setSession(null);
                setUser(null);
              } else {
                // No MFA required - set session and navigate
                sessionStorage.removeItem('oauth_login_pending');
                setSession(data.session);
                setUser(data.session.user);
                navigate('/dashboard');
              }
            }
            
            // Dispatch event to notify Auth.tsx OAuth is complete
            window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: true } }));
          } catch (err) {
            console.error('Failed to set session from OAuth callback:', err);
            window.dispatchEvent(new CustomEvent('oauth-complete', { detail: { success: false } }));
          }
        }
      }
    };
    
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [navigate]);

  const signOut = async () => {
    localStorage.removeItem('aura_remember_me');
    setMfaRequired(false);
    setMfaFactorId(null);
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
    navigate('/');
  };

  const clearMfaState = async () => {
    // Sign out the user completely when they cancel MFA
    setMfaRequired(false);
    setMfaFactorId(null);
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  };

  const completeMfaVerification = async () => {
    // After MFA is verified, fetch and set the current session
    sessionStorage.removeItem('oauth_login_pending');
    const { data: { session: verifiedSession } } = await supabase.auth.getSession();
    if (verifiedSession) {
      setSession(verifiedSession);
      setUser(verifiedSession.user);
    }
    setMfaRequired(false);
    setMfaFactorId(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut, 
      loading,
      mfaRequired,
      mfaFactorId,
      clearMfaState,
      completeMfaVerification
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
