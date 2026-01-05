import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ExpandingSelectorProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: 'start' | 'end';
  className?: string;
  contentClassName?: string;
}

export const ExpandingSelector = ({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  className,
  contentClassName,
}: ExpandingSelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger always visible */}
      <div 
        onClick={() => onOpenChange(!open)}
        className={cn(
          "cursor-pointer rounded-xl border border-border bg-background transition-shadow",
          open && "shadow-lg"
        )}
      >
        {trigger}
      </div>

      {/* Expanded content as overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            className={cn(
              "absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-background shadow-xl overflow-hidden z-50",
              align === 'end' && "left-auto right-0",
              contentClassName
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
