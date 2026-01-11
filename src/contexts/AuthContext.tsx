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
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // MFA is required if current level is aal1 and next level is aal2
      if (aal.data?.currentLevel === 'aal1' && aal.data?.nextLevel === 'aal2') {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');
        
        if (verifiedFactor) {
          // MFA required but not verified
          setMfaRequired(true);
          setMfaFactorId(verifiedFactor.id);
          return true;
        }
      }
      
      // MFA not required or already verified
      return false;
    } catch (err) {
      console.error('MFA check failed:', err);
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
    
    // Web: Normal OAuth flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/#/dashboard`,
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
