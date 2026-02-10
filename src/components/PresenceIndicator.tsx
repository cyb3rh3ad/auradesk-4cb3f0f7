import { cn } from '@/lib/utils';
import { PresenceStatus } from '@/hooks/usePresence';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<PresenceStatus, { color: string; label: string }> = {
  online: { color: 'bg-green-500 shadow-green-500/50', label: 'Online' },
  idle: { color: 'bg-yellow-500 shadow-yellow-500/50', label: 'Idle' },
  offline: { color: 'bg-muted-foreground/40', label: 'Offline' },
  dnd: { color: 'bg-red-500 shadow-red-500/50', label: 'Do Not Disturb' },
  in_call: { color: 'bg-blue-500 shadow-blue-500/50', label: 'In a Call' },
};

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export const PresenceIndicator = ({ status, size = 'md', className }: PresenceIndicatorProps) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'rounded-full border-2 border-background shadow-sm block',
        config.color,
        sizeClasses[size],
        status === 'online' && 'animate-none',
        className
      )}
      title={config.label}
    />
  );
};

export const getPresenceLabel = (status: PresenceStatus): string => {
  return statusConfig[status]?.label || 'Offline';
};
