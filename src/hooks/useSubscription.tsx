import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type SubscriptionPlan = 'free' | 'advanced' | 'professional';

interface SubscriptionStatus {
  plan: SubscriptionPlan;
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

interface PlanLimits {
  meetingDuration: number; // in minutes, 0 = unlimited
  weeklyTokens: number; // 0 = unlimited
  fileStorageGB: number; // 0 = unlimited
}

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    meetingDuration: 45,
    weeklyTokens: 15,
    fileStorageGB: 100,
  },
  advanced: {
    meetingDuration: 90,
    weeklyTokens: 20,
    fileStorageGB: 1024, // 1TB
  },
  professional: {
    meetingDuration: 0, // unlimited
    weeklyTokens: 0, // unlimited
    fileStorageGB: 10240, // 10TB
  },
};

const SUBSCRIPTION_TIERS = {
  advanced: {
    priceId: 'price_1SSf8QAQiewycKy71UNE3OZC',
    productId: 'prod_TPU66nz20lMppo',
    price: '€5',
  },
  professional: {
    priceId: 'price_1SSf8gAQiewycKy7kGwqCWbv',
    productId: 'prod_TPU6bQ0eUriSFl',
    price: '€12',
  },
};

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    plan: 'free',
    subscribed: false,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = async () => {
    // Require both user AND a valid session with access token
    if (!user || !session?.access_token) {
      setStatus({
        plan: 'free',
        subscribed: false,
        subscriptionEnd: null,
        loading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setStatus({
        plan: data.plan || 'free',
        subscribed: data.subscribed || false,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus({
        plan: 'free',
        subscribed: false,
        subscriptionEnd: null,
        loading: false,
      });
    }
  };

  useEffect(() => {
    checkSubscription();
    
    // Refresh subscription status periodically
    const interval = setInterval(checkSubscription, 60000); // every minute
    
    return () => clearInterval(interval);
  }, [user, session?.access_token]);


  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open customer portal');
    }
  };

  const getPlanLimits = (plan?: SubscriptionPlan): PlanLimits => {
    return PLAN_LIMITS[plan || status.plan];
  };

  const canCreateMeeting = (duration: number): boolean => {
    const limits = getPlanLimits();
    return limits.meetingDuration === 0 || duration <= limits.meetingDuration;
  };

  const canUploadFile = (sizeInBytes: number): boolean => {
    const limits = getPlanLimits();
    const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
    return limits.fileStorageGB === 0 || sizeInGB <= limits.fileStorageGB;
  };

  const canUseAIToken = async (): Promise<boolean> => {
    const limits = getPlanLimits();
    if (limits.weeklyTokens === 0) return true; // unlimited
    
    if (!user) return false;

    try {
      // Get current week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ai_token_usage')
        .select('tokens_used')
        .eq('user_id', user.id)
        .eq('week_start', weekStart.toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const tokensUsed = data?.tokens_used || 0;
      return tokensUsed < limits.weeklyTokens;
    } catch (error) {
      console.error('Error checking AI token usage:', error);
      return false;
    }
  };

  const incrementAITokenUsage = async (): Promise<void> => {
    if (!user) return;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    try {
      const { data, error: fetchError } = await supabase
        .from('ai_token_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (data) {
        await supabase
          .from('ai_token_usage')
          .update({ tokens_used: data.tokens_used + 1 })
          .eq('id', data.id);
      } else {
        await supabase
          .from('ai_token_usage')
          .insert({
            user_id: user.id,
            week_start: weekStartStr,
            tokens_used: 1,
          });
      }
    } catch (error) {
      console.error('Error incrementing AI token usage:', error);
    }
  };

  return {
    ...status,
    limits: getPlanLimits(),
    checkSubscription,
    openCustomerPortal,
    canCreateMeeting,
    canUploadFile,
    canUseAIToken,
    incrementAITokenUsage,
    tiers: SUBSCRIPTION_TIERS,
  };
};