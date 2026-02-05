import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuroraLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Magical space-like AuraBubble logo with neon outlined "A"
 * Performance-optimized for mobile devices
 */
export const AuroraLogo = ({ size = 160, className = '', animated = true }: AuroraLogoProps) => {
  const uniqueId = useMemo(() => `aurora-logo-${Math.random().toString(36).substr(2, 9)}`, []);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  
  // On mobile or reduced motion, disable complex animations
  const shouldAnimate = animated && !isMobile && !prefersReducedMotion;
  
  // Fewer particles on mobile for performance
  const particles = useMemo(() => Array.from({ length: shouldAnimate ? 8 : 0 }, (_, i) => ({
    id: i,
    angle: (i * 45),
    radius: 0.35,
    size: 0.018,
    duration: 8 + i * 0.5,
    delay: i * 0.3,
  })), [shouldAnimate]);
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
        // 3D perspective
        perspective: '800px',
        perspectiveOrigin: 'center center',
      }}
    >
      {/* 3D sphere highlight - top light source */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 15%, hsl(0 0% 100% / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 30% 20%, hsl(0 0% 100% / 0.05) 0%, transparent 40%)
          `,
          zIndex: 50,
        }}
      />
      
      {/* 3D depth shadow underneath */}
      <div
        className="absolute rounded-full"
        style={{
          width: '90%',
          height: '20%',
          left: '5%',
          bottom: '-8%',
          background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          filter: 'blur(15px)',
          transform: 'rotateX(60deg)',
        }}
      />
      
      {/* Deep space background with 3D inner shadow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(240 30% 6% / 0.9) 0%, hsl(240 20% 3% / 0.7) 50%, transparent 70%)',
          boxShadow: `
            inset 0 ${size * 0.1}px ${size * 0.2}px hsl(0 0% 0% / 0.4),
            inset 0 -${size * 0.05}px ${size * 0.1}px hsl(var(--primary) / 0.1)
          `,
        }}
      />
      
      {/* Outer rotating nebula ring - CSS animation for performance */}
      <div
        className={`absolute inset-0 rounded-full ${shouldAnimate ? 'animate-spin' : ''}`}
        style={{
          background: `conic-gradient(from 0deg, 
            transparent 0deg, 
            hsl(var(--primary) / 0.25) 45deg, 
            hsl(280 70% 50% / 0.35) 90deg,
            hsl(180 80% 50% / 0.3) 135deg, 
            transparent 180deg,
            hsl(260 70% 55% / 0.25) 225deg,
            hsl(var(--primary) / 0.2) 270deg,
            transparent 315deg,
            transparent 360deg
          )`,
          filter: 'blur(10px)',
          animationDuration: '25s',
        }}
      />
      
      {/* Inner counter-rotating aurora - CSS animation */}
      <div
        className={`absolute inset-3 rounded-full ${shouldAnimate ? 'animate-spin' : ''}`}
        style={{
          background: `conic-gradient(from 180deg, 
            transparent 0deg, 
            hsl(170 80% 45% / 0.3) 60deg, 
            hsl(200 70% 50% / 0.25) 120deg,
            transparent 180deg,
            hsl(280 70% 55% / 0.3) 240deg,
            hsl(320 60% 50% / 0.2) 300deg,
            transparent 360deg
          )`,
          filter: 'blur(8px)',
          animationDuration: '18s',
          animationDirection: 'reverse',
        }}
      />
      
      {/* Third layer - static on mobile */}
      <div
        className="absolute inset-6 rounded-full"
        style={{
          background: `conic-gradient(from 90deg, 
            transparent 0deg, 
            hsl(220 80% 60% / 0.2) 90deg, 
            transparent 180deg,
            hsl(160 70% 50% / 0.2) 270deg,
            transparent 360deg
          )`,
          filter: 'blur(6px)',
        }}
      />
      
      {/* Static core glow - no animation for performance */}
      <div
        className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, hsl(280 50% 30% / 0.08) 50%, transparent 70%)',
          opacity: 0.6,
        }}
      />
      
      {/* Floating particles - only on desktop */}
      {shouldAnimate && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: size * p.size,
            height: size * p.size,
            background: p.id % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(180 80% 60%)',
            boxShadow: `0 0 ${size * 0.02}px currentColor`,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) rotate(${p.angle}deg) translateX(${size * p.radius}px)`,
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
      
      {/* The A monogram - THICC NEON STYLE */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 20 }}
      >
        <defs>
          {/* Neon glow gradient for stroke */}
          <linearGradient id={`${uniqueId}-stroke`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(280 80% 70%)" />
            <stop offset="50%" stopColor="hsl(262 83% 58%)" />
            <stop offset="100%" stopColor="hsl(180 80% 60%)" />
          </linearGradient>
          
          {/* Simplified glow filter for mobile */}
          <filter id={`${uniqueId}-neon`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer glow layer */}
        <path
          d="M50 26 L30 74 M50 26 L70 74 M38 58 L62 58"
          fill="none"
          stroke="hsl(262 83% 58% / 0.3)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* The A - THICC strokes with neon glow */}
        <path
          d="M50 26 L30 74 M50 26 L70 74 M38 58 L62 58"
          fill="none"
          stroke={`url(#${uniqueId}-stroke)`}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${uniqueId}-neon)`}
        />
        
        {/* Inner bright core */}
        <path
          d="M50 26 L30 74 M50 26 L70 74 M38 58 L62 58"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      </svg>
      
      {/* 3D Glass rim - top highlight */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `
            linear-gradient(180deg, 
              hsl(0 0% 100% / 0.12) 0%, 
              transparent 30%, 
              transparent 70%, 
              hsl(var(--primary) / 0.08) 100%
            )
          `,
          zIndex: 40,
        }}
      />
      
      {/* Outer bubble ring - static for performance */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: '2px solid transparent',
          borderTopColor: 'hsl(0 0% 100% / 0.15)',
          borderBottomColor: 'hsl(var(--primary) / 0.2)',
          boxShadow: `
            0 0 ${size * 0.15}px hsl(var(--primary) / 0.1),
            inset 0 0 ${size * 0.12}px hsl(var(--primary) / 0.05),
            0 ${size * 0.02}px ${size * 0.04}px hsl(0 0% 0% / 0.3)
          `,
          zIndex: 30,
        }}
      />
      
      {/* Secondary bubble ring - static */}
      <div
        className="absolute inset-2 rounded-full"
        style={{
          border: '1px solid transparent',
          borderTopColor: 'hsl(280 60% 70% / 0.1)',
          borderBottomColor: 'hsl(180 70% 50% / 0.08)',
          opacity: 0.5,
        }}
      />
    </div>
  );
};

/**
 * Hero version with enhanced cosmic ambient effects
 */
export const AuroraLogoHero = ({ size = 260 }: { size?: number }) => {
  return (
    <div
      className="relative flex items-center justify-center mx-auto w-full"
      style={{ maxWidth: size, aspectRatio: '1/1' }}
    >
      {/* Static ambient glow - no animation for performance */}
      <div
        className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, hsl(280 50% 20% / 0.08) 40%, transparent 70%)',
          transform: 'scale(2.2)',
          opacity: 0.4,
        }}
      />
      
      {/* The logo - centered properly */}
      <AuroraLogo size={size} animated={true} className="relative z-10" />
    </div>
  );
};

export default AuroraLogo;
