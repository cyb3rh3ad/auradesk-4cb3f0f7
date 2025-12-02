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
        const { data, error } = await supabase.functions.invoke('initialize-owner');
        
        if (error) throw error;
        
        if (data?.isOwner && data?.message === "You are now the owner!") {
          toast.success('Welcome! You are now the owner with Professional plan access.');
          // Refresh the page to update subscription status
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        console.error('Error initializing owner:', error);
      } finally {
        setChecked(true);
      }
    };

    initializeOwner();
  }, [user, checked]);

  return null;
};
