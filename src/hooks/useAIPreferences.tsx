import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AIPreferences {
  default_processing_type: 'summary' | 'bullet_points' | 'full' | 'custom';
  custom_instructions: string | null;
  enable_background_assistant: boolean;
}

export const useAIPreferences = () => {
  const [preferences, setPreferences] = useState<AIPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_ai_preferences' as any)
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data as unknown as AIPreferences);
      } else {
        // Create default preferences
        const defaultPrefs: AIPreferences = {
          default_processing_type: 'summary',
          custom_instructions: null,
          enable_background_assistant: false,
        };
        
        const { error: insertError } = await supabase
          .from('user_ai_preferences' as any)
          .insert({
            user_id: user?.id,
            ...defaultPrefs,
          });

        if (insertError) throw insertError;
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<AIPreferences>) => {
    try {
      const { error } = await supabase
        .from('user_ai_preferences' as any)
        .update(updates)
        .eq('user_id', user?.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);

      toast({
        title: 'Settings Updated',
        description: 'Your AI preferences have been saved',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences,
  };
};