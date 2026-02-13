import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToBottomFABProps {
  visible: boolean;
  unreadBelow?: number;
  onClick: () => void;
}

export const ScrollToBottomFAB = ({ visible, unreadBelow = 0, onClick }: ScrollToBottomFABProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={onClick}
          className={cn(
            'absolute right-4 bottom-20 md:bottom-24 z-20',
            'w-10 h-10 rounded-full',
            'bg-card/95 backdrop-blur-xl border border-border/50 shadow-xl',
            'flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-card',
            'active:scale-90 transition-all touch-manipulation'
          )}
        >
          <ChevronDown className="w-5 h-5" />
          {unreadBelow > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadBelow > 99 ? '99+' : unreadBelow}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
};
