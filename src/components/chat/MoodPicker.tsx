import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MOOD_OPTIONS = [
  { emoji: '😊', text: 'Happy' },
  { emoji: '🎧', text: 'Listening to music' },
  { emoji: '💻', text: 'Working' },
  { emoji: '🏃', text: 'Exercising' },
  { emoji: '🎮', text: 'Gaming' },
  { emoji: '📚', text: 'Studying' },
  { emoji: '😴', text: 'Sleeping' },
  { emoji: '🍕', text: 'Eating' },
  { emoji: '✈️', text: 'Traveling' },
  { emoji: '🎉', text: 'Celebrating' },
  { emoji: '🤒', text: 'Not feeling well' },
  { emoji: '🧘', text: 'Meditating' },
  { emoji: '☕', text: 'Coffee break' },
  { emoji: '🔥', text: 'On fire' },
  { emoji: '🌙', text: 'Night owl' },
  { emoji: '❌', text: 'Clear status' },
];

interface MoodPickerProps {
  currentEmoji?: string | null;
  currentText?: string | null;
  onClose?: () => void;
}

export const MoodPicker = ({ currentEmoji, currentText, onClose }: MoodPickerProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSelect = async (emoji: string, text: string) => {
    if (!user) return;
    setSaving(true);

    const isClear = emoji === '❌';
    const { error } = await supabase
      .from('profiles')
      .update({
        mood_emoji: isClear ? null : emoji,
        mood_text: isClear ? null : text,
      } as any)
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update mood');
    } else {
      toast.success(isClear ? 'Mood cleared' : `Mood set to ${emoji} ${text}`);
    }
    setSaving(false);
    onClose?.();
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {MOOD_OPTIONS.map((mood, i) => {
        const isActive = mood.emoji === currentEmoji;
        return (
          <motion.button
            key={mood.emoji}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
            disabled={saving}
            onClick={() => handleSelect(mood.emoji, mood.text)}
            className={cn(
              'flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all touch-manipulation',
              'hover:bg-muted/60 active:scale-90',
              isActive && 'bg-primary/15 ring-1 ring-primary/30'
            )}
          >
            <span className="text-xl">{mood.emoji}</span>
            <span className="text-[10px] text-muted-foreground leading-tight text-center">{mood.text}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

/** Small inline display of a user's mood */
export const MoodBadge = ({ emoji, text, className }: { emoji?: string | null; text?: string | null; className?: string }) => {
  if (!emoji) return null;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs text-muted-foreground', className)} title={text || undefined}>
      <span>{emoji}</span>
    </span>
  );
};
