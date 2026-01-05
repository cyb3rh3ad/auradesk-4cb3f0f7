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
      <motion.div
        layout
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-background shadow-lg",
          contentClassName
        )}
        initial={false}
        animate={{
          width: open ? 'auto' : 'auto',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      >
        <div 
          onClick={() => onOpenChange(!open)}
          className="cursor-pointer"
        >
          {trigger}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
