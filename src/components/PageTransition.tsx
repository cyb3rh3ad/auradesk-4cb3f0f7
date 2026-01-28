import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Define page order for determining slide direction
const pageOrder = [
  '/dashboard',
  '/chat',
  '/teams',
  '/meetings',
  '/files',
  '/ai',
  '/subscription',
  '/admin',
  '/settings'
];

const getPageIndex = (path: string) => {
  const index = pageOrder.indexOf(path);
  return index === -1 ? pageOrder.length : index;
};

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const currentIndex = getPageIndex(location.pathname);

  // Mobile: Smooth slide transitions based on navigation direction
  if (isMobile) {
    return (
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8
        }}
        className="w-full h-full"
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    );
  }

  // Desktop: Subtle fade with scale
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.99 }}
      transition={{
        type: "tween",
        ease: [0.25, 0.1, 0.25, 1],
        duration: 0.2
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

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

// Page header with shared layout animation
interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  pageId: string;
}

export const PageHeader = ({ icon, title, subtitle, actions, pageId }: PageHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <motion.div 
      className="relative mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Background glow effects */}
      <motion.div 
        className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      />
      <motion.div 
        className="absolute -top-20 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div 
            layoutId={`page-icon-${pageId}`}
            className={`p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ${isMobile ? '' : 'md:p-2.5'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {icon}
          </motion.div>
          <div>
            <motion.h1 
              layoutId={`page-title-${pageId}`}
              className={`text-xl font-bold text-foreground ${isMobile ? '' : 'md:text-4xl'}`}
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p 
                className={`text-sm text-muted-foreground ${isMobile ? '' : 'md:text-lg'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {actions}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Staggered list animation for items
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export const StaggeredList = ({ children, staggerDelay = 0.05, className }: StaggeredListProps) => {
  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Card with entrance animation
interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  onClick?: () => void;
}

export const AnimatedCard = ({ children, index = 0, className, onClick }: AnimatedCardProps) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: index * 0.05
      }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
