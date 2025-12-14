import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const OwnerInitializer = () => {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || checked) return;

    const initializeOwner = async () => {
      try {
        // Get current session to ensure we have a valid token
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.log('No active session, skipping owner initialization');
          return;
        }

        const { data, error } = await supabase.functions.invoke('initialize-owner');
        
        if (error) {
          console.error('Owner initialization error:', error);
          return;
        }
        
        if (data?.isOwner && data?.message === "You are now the owner!") {
          toast.success('Welcome! You are now the owner with Professional plan access.');
          // Refresh subscription status
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        console.error('Error initializing owner:', error);
      } finally {
        setChecked(true);
      }
    };

    // Small delay to ensure session is fully established
    const timer = setTimeout(initializeOwner, 500);
    return () => clearTimeout(timer);
  }, [user, checked]);

  return null;
};
