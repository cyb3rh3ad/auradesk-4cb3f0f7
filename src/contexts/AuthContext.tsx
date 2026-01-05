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

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!currentSession) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Session exists - ALWAYS check MFA before allowing access
        const mfaNeeded = await checkAndHandleMfa(currentSession);
        
        if (!mounted) return;

        if (mfaNeeded) {
          // MFA required - block access completely
          setSession(null);
          setUser(null);
          setLoading(false);
          // Don't navigate here - ProtectedRoute will handle redirect
        } else {
          // MFA verified or not required - allow access
          setSession(currentSession);
          setUser(currentSession.user);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (mounted) {
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
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // For SIGNED_IN and TOKEN_REFRESHED, check MFA
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          if (!mounted) return;

          const mfaNeeded = await checkAndHandleMfa(newSession);
          
          if (!mounted) return;

          if (mfaNeeded) {
            setSession(null);
            setUser(null);
            setLoading(false);
          } else {
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

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      }
    });
    return { error };
  };

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
