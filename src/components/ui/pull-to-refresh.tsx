import { ReactNode } from 'react';
import { Loader2, ArrowDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/utils/haptics';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh = ({
  children,
  onRefresh,
  className,
  disabled = false,
}: PullToRefreshProps) => {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh: async () => {
      triggerHaptic('medium');
      await onRefresh();
      triggerHaptic('success');
    },
    disabled,
    threshold: 80,
  });

  const showIndicator = pullDistance > 10 || isRefreshing;
  const isReady = pullDistance >= 80;
  const progress = Math.min(pullDistance / 80, 1);

  return (
    <div
      className={cn('relative h-full', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
            style={{
              top: 0,
              height: Math.max(pullDistance, isRefreshing ? 56 : 0),
            }}
          >
            <motion.div
              animate={isRefreshing ? { 
                boxShadow: ['0 0 20px hsl(var(--primary)/0.3)', '0 0 40px hsl(var(--primary)/0.5)', '0 0 20px hsl(var(--primary)/0.3)']
              } : {}}
              transition={isRefreshing ? { duration: 1.5, repeat: Infinity } : {}}
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-2xl bg-card/90 backdrop-blur-xl border transition-all duration-300',
                isReady && !isRefreshing && 'bg-primary/20 border-primary/50 scale-110',
                isRefreshing && 'bg-primary/15 border-primary/40',
                !isReady && !isRefreshing && 'border-border/50'
              )}
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
            >
              {isRefreshing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-5 h-5 text-primary" />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ 
                    y: isReady ? -2 : 0,
                    scale: isReady ? 1.1 : 1
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <ArrowDown
                    className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      isReady ? 'text-primary' : 'text-muted-foreground'
                    )}
                    style={{
                      transform: `rotate(${isReady ? 180 : 0}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                  />
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with transform */}
      <div
        className="h-full"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};
