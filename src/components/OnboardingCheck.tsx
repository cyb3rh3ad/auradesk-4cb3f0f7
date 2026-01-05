import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingDialog } from './OnboardingDialog';

export const OnboardingCheck = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setChecked(true);
        return;
      }

      // Check if user has completed onboarding (has a username set)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, created_at')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setChecked(true);
        return;
      }

      // If username is not set and account was created recently (within 5 minutes), show onboarding
      const createdAt = new Date(profile.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const isNewUser = createdAt > fiveMinutesAgo;
      const hasNoUsername = !profile.username;
      
      // Also check localStorage to not show onboarding twice
      const onboardingCompleted = localStorage.getItem(`onboarding_${user.id}`);
      
      if (isNewUser && hasNoUsername && !onboardingCompleted) {
        setShowOnboarding(true);
      }
      
      setChecked(true);
    };

    checkOnboarding();
  }, [user]);

  const handleOpenChange = (open: boolean) => {
    setShowOnboarding(open);
    if (!open && user) {
      // Mark onboarding as completed
      localStorage.setItem(`onboarding_${user.id}`, 'true');
    }
  };

  if (!checked) return null;

  return (
    <OnboardingDialog 
      open={showOnboarding} 
      onOpenChange={handleOpenChange} 
    />
  );
};