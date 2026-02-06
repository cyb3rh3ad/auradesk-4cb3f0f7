import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AuraBubbleIconProps {
  children: ReactNode;
  size?: number;
  isHovered?: boolean;
  isActive?: boolean;
  className?: string;
}

/**
 * Wraps sidebar icons with the magical AuraBubble effect on hover
 * Shows rotating nebula rings and particles when hovered
 */
export const AuraBubbleIcon = ({ 
  children, 
  size = 40, 
  isHovered = false, 
  isActive = false,
  className = '' 
}: AuraBubbleIconProps) => {
  const uniqueId = useMemo(() => `bubble-icon-${Math.random().toString(36).substr(2, 9)}`, []);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  
  // Desktop: animations. Mobile: static for performance
  const shouldAnimate = !isMobile && !prefersReducedMotion && isHovered;
  
  // Only generate particles when hovered on desktop
  const particles = useMemo(() => shouldAnimate ? Array.from({ length: 5 }, (_, i) => ({
    id: i,
    angle: (i * 72),
    radius: 0.35,
    size: 0.06,
    duration: 4 + i * 0.3,
    delay: i * 0.15,
    color: i % 3 === 0 ? 'hsl(var(--primary))' : i % 3 === 1 ? 'hsl(180 80% 60%)' : 'hsl(280 70% 70%)',
  })) : [], [shouldAnimate]);
  
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      {/* Show bubble effect when hovered or active */}
      {(isHovered || isActive) && (
        <>
          {/* Deep space background */}
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'radial-gradient(circle, hsl(240 30% 8% / 0.95) 0%, hsl(240 20% 5% / 0.8) 50%, transparent 70%)',
            }}
          />
          
          {/* Rotating nebula ring - only on hover desktop */}
          {shouldAnimate && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, 
                  transparent 0deg, 
                  hsl(var(--primary) / 0.3) 60deg, 
                  hsl(280 70% 50% / 0.35) 120deg,
                  hsl(180 80% 50% / 0.3) 180deg, 
                  transparent 240deg,
                  hsl(var(--primary) / 0.25) 300deg,
                  transparent 360deg
                )`,
                filter: 'blur(4px)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
          )}
          
          {/* Counter-rotating inner aurora */}
          {shouldAnimate && (
            <motion.div
              className="absolute inset-1 rounded-full"
              style={{
                background: `conic-gradient(from 180deg, 
                  transparent 0deg, 
                  hsl(170 80% 45% / 0.3) 90deg, 
                  transparent 180deg,
                  hsl(280 70% 55% / 0.3) 270deg,
                  transparent 360deg
                )`,
                filter: 'blur(3px)',
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          )}
          
          {/* Static glow for active/mobile */}
          {!shouldAnimate && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 45deg, 
                  transparent 0deg, 
                  hsl(var(--primary) / 0.2) 60deg, 
                  hsl(280 70% 50% / 0.25) 120deg,
                  transparent 180deg,
                  hsl(180 80% 50% / 0.2) 240deg,
                  transparent 300deg
                )`,
                filter: 'blur(3px)',
              }}
            />
          )}
          
          {/* Core glow */}
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
            }}
            animate={shouldAnimate ? {
              opacity: [0.5, 0.8, 0.5],
              scale: [0.95, 1.05, 0.95],
            } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Floating particles - desktop hover only */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: size * p.size,
                height: size * p.size,
                background: p.color,
                boxShadow: `0 0 ${size * 0.04}px ${p.color}`,
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [
                  Math.cos(p.angle * Math.PI / 180) * size * p.radius,
                  Math.cos((p.angle + 180) * Math.PI / 180) * size * p.radius,
                  Math.cos((p.angle + 360) * Math.PI / 180) * size * p.radius,
                ],
                y: [
                  Math.sin(p.angle * Math.PI / 180) * size * p.radius,
                  Math.sin((p.angle + 180) * Math.PI / 180) * size * p.radius,
                  Math.sin((p.angle + 360) * Math.PI / 180) * size * p.radius,
                ],
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: p.delay,
              }}
            />
          ))}
          
          {/* Bubble rim */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '1.5px solid transparent',
              borderTopColor: 'hsl(0 0% 100% / 0.15)',
              borderBottomColor: 'hsl(var(--primary) / 0.25)',
              boxShadow: `
                0 0 ${size * 0.2}px hsl(var(--primary) / 0.15),
                inset 0 0 ${size * 0.1}px hsl(var(--primary) / 0.08)
              `,
            }}
            animate={shouldAnimate ? {
              scale: [1, 1.02, 1],
              opacity: [0.7, 1, 0.7],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Top highlight */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 70% 40% at 50% 15%, hsl(0 0% 100% / 0.1) 0%, transparent 50%)
              `,
            }}
          />
        </>
      )}
      
      {/* The actual icon */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AuraBubbleIcon;
