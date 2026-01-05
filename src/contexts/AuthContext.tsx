import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
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
  clearMfaState: () => void;
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

  useEffect(() => {
    let mfaCheckInProgress = false;
    
    const checkMfaForOAuthUser = async (session: Session): Promise<boolean> => {
      if (mfaCheckInProgress) return false;
      mfaCheckInProgress = true;
      
      try {
        const isOAuthLogin = session.user.app_metadata?.provider !== 'email';
        if (!isOAuthLogin) {
          mfaCheckInProgress = false;
          return false;
        }
        
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');
        
        if (verifiedFactor) {
          // Check if MFA has been verified in this session
          const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal.data?.currentLevel === 'aal1' && aal.data?.nextLevel === 'aal2') {
            // MFA is required but not yet verified
            setMfaRequired(true);
            setMfaFactorId(verifiedFactor.id);
            mfaCheckInProgress = false;
            return true;
          }
        }
        mfaCheckInProgress = false;
        return false;
      } catch {
        mfaCheckInProgress = false;
        return false;
      }
    };
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setMfaRequired(false);
          setMfaFactorId(null);
          setLoading(false);
          return;
        }
        
        if (!session) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // For SIGNED_IN or INITIAL_SESSION with OAuth, check MFA
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session.user.app_metadata?.provider !== 'email') {
          setTimeout(async () => {
            const mfaNeeded = await checkMfaForOAuthUser(session);
            if (mfaNeeded) {
              // Don't set user/session - redirect to auth
              setLoading(false);
              navigate('/auth');
            } else {
              setSession(session);
              setUser(session.user);
              setLoading(false);
            }
          }, 0);
        } else {
          // Email login or token refresh - set normally
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setLoading(false);
        return;
      }
      
      // Check MFA status - only require verification if session is at aal1 and needs aal2
      try {
        const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        // Only require MFA if:
        // 1. Current level is aal1 (not yet verified in this session)
        // 2. Next level is aal2 (MFA is enabled and required)
        if (aal.data?.currentLevel === 'aal1' && aal.data?.nextLevel === 'aal2') {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');
          
          if (verifiedFactor) {
            // MFA required but not verified - redirect to auth
            setMfaRequired(true);
            setMfaFactorId(verifiedFactor.id);
            setLoading(false);
            navigate('/auth');
            return; // Don't set user/session until MFA verified
          }
        }
        // If currentLevel is already aal2, MFA was already verified - proceed normally
      } catch (err) {
        console.error('MFA check failed:', err);
      }
      
      setSession(session);
      setUser(session.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    
    // Check if MFA is required
    if (data?.session) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');
      
      if (verifiedFactor) {
        // MFA is enabled, need verification
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
    await supabase.auth.signOut();
    navigate('/');
  };

  const clearMfaState = async () => {
    // Sign out the user when they cancel MFA
    await supabase.auth.signOut();
    setMfaRequired(false);
    setMfaFactorId(null);
    setSession(null);
    setUser(null);
  };

  const completeMfaVerification = async () => {
    // After MFA is verified, fetch and set the current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setSession(session);
      setUser(session.user);
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
