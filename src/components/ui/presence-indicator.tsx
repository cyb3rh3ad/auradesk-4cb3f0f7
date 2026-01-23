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
    pulse: false, // No pulse for online - just solid green
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

// Increased sizes for better visibility
const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const PresenceIndicator = memo(({ status, size = 'md', className }: PresenceIndicatorProps) => {
  const config = statusConfig[status];
  
  return (
    <div
      className={cn(
        'rounded-full border-2 border-background shadow-md',
        sizeClasses[size],
        config.color,
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