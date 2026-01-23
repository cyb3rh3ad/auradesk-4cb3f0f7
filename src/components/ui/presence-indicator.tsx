import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/hooks/usePresence';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<PresenceStatus, { color: string; label: string; pulse?: boolean }> = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
    pulse: true,
  },
  away: {
    color: 'bg-yellow-500',
    label: 'Away',
  },
  dnd: {
    color: 'bg-red-500',
    label: 'Do Not Disturb',
  },
  in_meeting: {
    color: 'bg-purple-500',
    label: 'In a Meeting',
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
  },
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const PresenceIndicator = memo(({ status, size = 'md', className }: PresenceIndicatorProps) => {
  const config = statusConfig[status];
  
  return (
    <div
      className={cn(
        'rounded-full border-2 border-background shadow-sm',
        sizeClasses[size],
        config.color,
        config.pulse && 'animate-pulse-soft',
        className
      )}
      title={config.label}
      aria-label={config.label}
    />
  );
});

PresenceIndicator.displayName = 'PresenceIndicator';

// Wrapper for positioning on avatars
interface AvatarWithPresenceProps {
  children: React.ReactNode;
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarWithPresence = memo(({ children, status, size = 'md', className }: AvatarWithPresenceProps) => {
  return (
    <div className={cn('relative inline-block', className)}>
      {children}
      <PresenceIndicator 
        status={status} 
        size={size}
        className="absolute bottom-0 right-0 translate-x-[2px] translate-y-[2px]"
      />
    </div>
  );
});

AvatarWithPresence.displayName = 'AvatarWithPresence';
