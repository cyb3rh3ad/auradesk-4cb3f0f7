import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
    // Improved detection for various mobile browser behaviors
    const checkIsOAuthLogin = () => {
      const fullUrl = window.location.href;
      const hash = window.location.hash;
      const search = window.location.search;
      
      // Check various places OAuth tokens might appear depending on browser
      // Mobile browsers sometimes put OAuth params in unexpected places
      const hasOAuthParams = 
        hash.includes('access_token') || 
        hash.includes('refresh_token') ||
        hash.includes('error_description') ||
        search.includes('code=') ||
        search.includes('access_token') ||
        search.includes('refresh_token') ||
        // Some mobile browsers put params after the hash route
        fullUrl.includes('access_token=') ||
        fullUrl.includes('refresh_token=') ||
        // Check for OAuth error indicators too
        fullUrl.includes('error=') ||
        hash.includes('error=');
      
      if (hasOAuthParams) {
        // Mark this as a fresh OAuth login
        console.log('OAuth params detected in URL, marking as OAuth login');
        sessionStorage.setItem('oauth_login_pending', 'true');
        // Store timestamp to prevent stale pending states
        sessionStorage.setItem('oauth_login_time', Date.now().toString());
        return true;
      }
      
      // Check if we recently came from OAuth (within last 30 seconds)
      const pending = sessionStorage.getItem('oauth_login_pending');
      const loginTime = sessionStorage.getItem('oauth_login_time');
      
      if (pending === 'true' && loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        // Clear stale OAuth pending state after 30 seconds
        if (elapsed > 30000) {
          console.log('Clearing stale OAuth pending state');
          sessionStorage.removeItem('oauth_login_pending');
          sessionStorage.removeItem('oauth_login_time');
          return false;
        }
        return true;
      }
      
      return false;
    };

    const initializeAuth = async () => {
      try {
        const isOAuthLogin = checkIsOAuthLogin();
        console.log('Initializing auth, isOAuthLogin:', isOAuthLogin);
        
        // Give Supabase MORE time to process OAuth tokens from URL on mobile
        // Mobile browsers are significantly slower at processing OAuth redirects
        if (isOAuthLogin) {
          console.log('OAuth login detected, waiting for token processing...');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        let currentSession: Session | null = null;
        let sessionError: any = null;
        
        // First attempt
        const firstAttempt = await supabase.auth.getSession();
        currentSession = firstAttempt.data?.session;
        sessionError = firstAttempt.error;
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }
        
        if (!mounted) return;

        // If OAuth login but no session, retry with exponential backoff
        // This is critical for mobile browsers that are slow to process tokens
        if (!currentSession && isOAuthLogin) {
          console.log('OAuth login but no session on first attempt, retrying...');
          
          // Retry up to 3 times with increasing delays
          const retryDelays = [500, 1000, 1500];
          
          for (let i = 0; i < retryDelays.length; i++) {
            await new Promise(resolve => setTimeout(resolve, retryDelays[i]));
            
            if (!mounted) return;
            
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            
            if (retrySession) {
              console.log(`Session found on retry attempt ${i + 1}`);
              currentSession = retrySession;
              break;
            }
            
            console.log(`Retry attempt ${i + 1} - still no session`);
          }
        }
        
        if (!mounted) return;

        if (!currentSession) {
          // No session after all retries
          console.log('No session found after all attempts');
          sessionStorage.removeItem('oauth_login_pending');
          sessionStorage.removeItem('oauth_login_time');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Session exists - ALWAYS check MFA before allowing access
        console.log('Session found, checking MFA...');
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
            sessionStorage.removeItem('oauth_login_time');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setMfaRequired(false);
            setMfaFactorId(null);
            setLoading(false);
          }
        } else {
          // MFA verified or not required - allow access
          console.log('MFA not required or already verified, granting access');
          sessionStorage.removeItem('oauth_login_pending');
          sessionStorage.removeItem('oauth_login_time');
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (mounted) {
          sessionStorage.removeItem('oauth_login_pending');
          sessionStorage.removeItem('oauth_login_time');
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
          sessionStorage.removeItem('oauth_login_time');
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
          sessionStorage.removeItem('oauth_login_time');
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
            sessionStorage.removeItem('oauth_login_time');
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
    const isElectron = typeof window !== 'undefined' && 
      (window.location.protocol === 'file:' || (window as any).electronAPI?.isElectron);
    
    if (isElectron) {
      return null;
    }
    
    // Use origin only - main.tsx handles token extraction before React renders
    return window.location.origin;
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
    
    // Mark OAuth login as pending BEFORE redirect - this ensures MFA check runs
    sessionStorage.setItem('oauth_login_pending', 'true');
    sessionStorage.setItem('oauth_login_time', Date.now().toString());
    
    // Web: Normal OAuth flow
    // IMPORTANT: Do NOT use hash routes in redirectTo - it creates double-hash URLs
    // that break token parsing (e.g., /#/auth#access_token=...). 
    // Redirect to origin only and let AuthProvider handle routing after session is established.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    return { error };
  };

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
                sessionStorage.removeItem('oauth_login_time');
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
    sessionStorage.removeItem('oauth_login_time');
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
