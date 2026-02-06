import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { memo, useMemo } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Optimized mobile animation - minimal, GPU-only transforms
const mobileVariants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 }
};

// Desktop animation with subtle scale
const desktopVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 }
};

// Ultra-fast transition for mobile - prioritize responsiveness
const mobileTransition = {
  type: "tween" as const,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  duration: 0.15
};

// Slightly richer desktop transition
const desktopTransition = {
  type: "tween" as const,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  duration: 0.18
};

export const PageTransition = memo(({ children }: PageTransitionProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Skip all animations if user prefers reduced motion
  if (prefersReducedMotion) {
    return <div className="w-full h-full">{children}</div>;
  }

  const variants = isMobile ? mobileVariants : desktopVariants;
  const transition = isMobile ? mobileTransition : desktopTransition;

  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      className="w-full h-full"
      style={{ 
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)'
      }}
    >
      {children}
    </motion.div>
  );
});

// Shared element wrapper for elements that persist across pages
interface SharedElementProps {
  layoutId: string;
  children: React.ReactNode;
  className?: string;
}

export const SharedElement = ({ layoutId, children, className }: SharedElementProps) => {
  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 30
      }}
    >
      {children}
    </motion.div>
  );
};

// Page header - simplified for performance
interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  pageId: string;
}

export const PageHeader = memo(({ icon, title, subtitle, actions, pageId }: PageHeaderProps) => {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Static render for reduced motion preference
  if (prefersReducedMotion) {
    return (
      <div className="relative mb-6">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ${isMobile ? '' : 'md:p-2.5'}`}>
              {icon}
            </div>
            <div>
              <h1 className={`text-xl font-bold text-foreground ${isMobile ? '' : 'md:text-4xl'}`}>{title}</h1>
              {subtitle && <p className={`text-sm text-muted-foreground ${isMobile ? '' : 'md:text-lg'}`}>{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="relative mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background glow - CSS-only, no animation */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ${isMobile ? '' : 'md:p-2.5'}`}>
            {icon}
          </div>
          <div>
            <h1 className={`text-xl font-bold text-foreground ${isMobile ? '' : 'md:text-4xl'}`}>{title}</h1>
            {subtitle && (
              <p className={`text-sm text-muted-foreground ${isMobile ? '' : 'md:text-lg'}`}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions}
      </div>
    </motion.div>
  );
});

// Staggered list - optimized with CSS fallback
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export const StaggeredList = memo(({ children, staggerDelay = 0.03, className }: StaggeredListProps) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // On mobile or reduced motion, use simple CSS animation
  if (prefersReducedMotion || isMobile) {
    return (
      <div className={className}>
        {children.map((child, index) => (
          <div 
            key={index} 
            className="animate-fade-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } }
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 }
          }}
          transition={{ type: "tween", duration: 0.15 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
});

// Card with entrance animation - optimized
interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  onClick?: () => void;
}

export const AnimatedCard = memo(({ children, index = 0, className, onClick }: AnimatedCardProps) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Static card for mobile/reduced motion
  if (prefersReducedMotion || isMobile) {
    return (
      <div 
        className={`${className} animate-fade-in`} 
        style={{ animationDelay: `${index * 30}ms` }}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "tween",
        duration: 0.15,
        delay: index * 0.03
      }}
      onClick={onClick}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
});
