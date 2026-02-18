import { useState, useEffect } from 'react';
import { Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const FocusModeToggle = () => {
  const { myStatus, setManualStatus } = usePresenceContext();
  const { toast } = useToast();
  const isFocused = myStatus === 'dnd';

  const toggle = () => {
    if (isFocused) {
      setManualStatus('online');
      toast({ title: 'Focus mode off', description: "You're back online!" });
    } else {
      setManualStatus('dnd');
      toast({ title: '🎯 Focus mode on', description: 'Notifications silenced. Status set to DND.' });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(
        "relative h-9 w-9 rounded-xl transition-all",
        isFocused && "bg-destructive/10 text-destructive hover:bg-destructive/20"
      )}
      title={isFocused ? 'Exit focus mode' : 'Enter focus mode'}
    >
      <Focus className={cn("w-4 h-4", isFocused && "text-destructive")} />
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background"
          />
        )}
      </AnimatePresence>
    </Button>
  );
};
