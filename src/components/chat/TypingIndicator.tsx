import { memo } from 'react';
import { cn } from '@/lib/utils';

interface TypingUser {
  userId: string;
  username: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
}

export const TypingIndicator = memo(({ users, className }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const displayText = users.length === 1 
    ? `${users[0].username} is typing`
    : users.length === 2
    ? `${users[0].username} and ${users[1].username} are typing`
    : `${users[0].username} and ${users.length - 1} others are typing`;

  return (
    <div className={cn(
      "px-3 md:px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground animate-fade-in",
      className
    )}>
      <div className="flex items-center gap-2">
        {/* Animated typing dots bubble */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-muted/60 rounded-full">
          <TypingDots />
        </div>
        <span className="text-foreground/70 font-medium">{displayText}</span>
      </div>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// Animated typing dots component
const TypingDots = memo(() => {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full bg-primary/80",
            "animate-typing-dot"
          )}
          style={{
            animationDelay: `${i * 200}ms`,
          }}
        />
      ))}
    </div>
  );
});

TypingDots.displayName = 'TypingDots';
