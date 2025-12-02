import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PromoCodeValidation {
  valid: boolean;
  message?: string;
  promoCode?: {
    id: string;
    code: string;
    discount_percent: number;
    duration_months: number;
    stripeCouponId: string;
  };
}

export const usePromoCode = () => {
  const [validating, setValidating] = useState(false);
  const [validPromoCode, setValidPromoCode] = useState<PromoCodeValidation['promoCode'] | null>(null);

  const validatePromoCode = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      toast.error('Please enter a promo code');
      return false;
    }

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: code.trim() },
      });

      if (error) throw error;

      const result = data as PromoCodeValidation;
      
      if (result.valid && result.promoCode) {
        setValidPromoCode(result.promoCode);
        toast.success(`Promo code applied! ${result.promoCode.discount_percent}% off for ${result.promoCode.duration_months} months`);
        return true;
      } else {
        setValidPromoCode(null);
        toast.error(result.message || 'Invalid promo code');
        return false;
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      toast.error('Failed to validate promo code');
      setValidPromoCode(null);
      return false;
    } finally {
      setValidating(false);
    }
  };

  const clearPromoCode = () => {
    setValidPromoCode(null);
  };

  return {
    validating,
    validPromoCode,
    validatePromoCode,
    clearPromoCode,
  };
};
