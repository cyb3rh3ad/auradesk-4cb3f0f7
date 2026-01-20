import { ReactNode } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

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
    onRefresh,
    disabled,
    threshold: 80,
  });

  const showIndicator = pullDistance > 10 || isRefreshing;
  const isReady = pullDistance >= 80;

  return (
    <div
      className={cn('relative h-full', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-200',
          showIndicator ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: 0,
          height: Math.max(pullDistance, isRefreshing ? 48 : 0),
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 transition-all duration-200',
            isReady && !isRefreshing && 'bg-primary/20 scale-110',
            isRefreshing && 'bg-primary/20'
          )}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                'w-5 h-5 text-primary transition-transform duration-200',
                isReady && 'rotate-180'
              )}
            />
          )}
        </div>
      </div>

      {/* Content with transform */}
      <div
        className="h-full transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
