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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Clear MFA state on successful login
        if (event === 'SIGNED_IN') {
          setMfaRequired(false);
          setMfaFactorId(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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

  const clearMfaState = () => {
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
      clearMfaState
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
