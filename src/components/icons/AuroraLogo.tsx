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
 * Desktop: Full animations with rotating nebulas, particles, and pulsing effects
 * Mobile: Beautiful static version optimized for performance
 */
export const AuroraLogo = ({ size = 160, className = '', animated = true }: AuroraLogoProps) => {
  const uniqueId = useMemo(() => `aurora-logo-${Math.random().toString(36).substr(2, 9)}`, []);
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  
  // Desktop: full animations. Mobile: completely static for smooth performance
  const isDesktop = !isMobile && !prefersReducedMotion && animated;
  
  // Particles only on desktop
  const particles = useMemo(() => isDesktop ? Array.from({ length: 10 }, (_, i) => ({
    id: i,
    angle: (i * 36),
    radius: 0.32 + (i % 3) * 0.04,
    size: 0.015 + (i % 2) * 0.008,
    duration: 6 + i * 0.4,
    delay: i * 0.25,
    color: i % 3 === 0 ? 'hsl(var(--primary))' : i % 3 === 1 ? 'hsl(180 80% 60%)' : 'hsl(280 70% 70%)',
  })) : [], [isDesktop]);
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
        perspective: isDesktop ? '800px' : undefined,
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
      
      {/* 3D depth shadow underneath - only on desktop */}
      {isDesktop && (
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
      )}
      
      {/* Deep space background with 3D inner shadow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(240 30% 6% / 0.9) 0%, hsl(240 20% 3% / 0.7) 50%, transparent 70%)',
          boxShadow: isDesktop ? `
            inset 0 ${size * 0.1}px ${size * 0.2}px hsl(0 0% 0% / 0.4),
            inset 0 -${size * 0.05}px ${size * 0.1}px hsl(var(--primary) / 0.1)
          ` : `inset 0 ${size * 0.08}px ${size * 0.15}px hsl(0 0% 0% / 0.3)`,
        }}
      />
      
      {/* ===== DESKTOP: Animated nebula rings ===== */}
      {isDesktop ? (
        <>
          {/* Outer rotating nebula ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
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
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Inner counter-rotating aurora */}
          <motion.div
            className="absolute inset-3 rounded-full"
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
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Third layer - slowest rotation */}
          <motion.div
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
            animate={{ rotate: 360 }}
            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Pulsing core glow */}
          <motion.div
            className="absolute inset-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, hsl(280 50% 30% / 0.08) 50%, transparent 70%)',
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [0.97, 1.03, 0.97],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      ) : (
        <>
          {/* ===== MOBILE: Static nebula layers ===== */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 30deg, 
                transparent 0deg, 
                hsl(var(--primary) / 0.2) 45deg, 
                hsl(280 70% 50% / 0.25) 90deg,
                hsl(180 80% 50% / 0.2) 135deg, 
                transparent 180deg,
                hsl(260 70% 55% / 0.2) 225deg,
                hsl(var(--primary) / 0.15) 270deg,
                transparent 315deg
              )`,
              filter: 'blur(8px)',
            }}
          />
          
          <div
            className="absolute inset-4 rounded-full"
            style={{
              background: `conic-gradient(from 150deg, 
                transparent 0deg, 
                hsl(170 80% 45% / 0.2) 60deg, 
                hsl(200 70% 50% / 0.15) 120deg,
                transparent 180deg,
                hsl(280 70% 55% / 0.2) 240deg,
                transparent 300deg
              )`,
              filter: 'blur(6px)',
            }}
          />
          
          {/* Static core glow */}
          <div
            className="absolute inset-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, hsl(280 50% 30% / 0.06) 50%, transparent 70%)',
              opacity: 0.6,
            }}
          />
        </>
      )}
      
      {/* Floating particles - DESKTOP ONLY */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: size * p.size,
            height: size * p.size,
            background: p.color,
            boxShadow: `0 0 ${size * 0.025}px ${p.color}`,
            left: '50%',
            top: '50%',
          }}
          animate={{
            x: [
              Math.cos(p.angle * Math.PI / 180) * size * p.radius,
              Math.cos((p.angle + 120) * Math.PI / 180) * size * (p.radius + 0.03),
              Math.cos((p.angle + 240) * Math.PI / 180) * size * p.radius,
              Math.cos((p.angle + 360) * Math.PI / 180) * size * p.radius,
            ],
            y: [
              Math.sin(p.angle * Math.PI / 180) * size * p.radius,
              Math.sin((p.angle + 120) * Math.PI / 180) * size * (p.radius + 0.03),
              Math.sin((p.angle + 240) * Math.PI / 180) * size * p.radius,
              Math.sin((p.angle + 360) * Math.PI / 180) * size * p.radius,
            ],
            opacity: [0.3, 0.9, 0.5, 0.3],
            scale: [0.8, 1.2, 1, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
      
      {/* Twinkling stars - DESKTOP ONLY */}
      {isDesktop && Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute rounded-full"
          style={{
            width: size * 0.01,
            height: size * 0.01,
            background: 'white',
            boxShadow: '0 0 3px white',
            left: `${25 + (i * 10)}%`,
            top: `${25 + ((i * 17) % 50)}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.5,
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
          
          {/* Multi-layer glow filter - stronger on desktop */}
          <filter id={`${uniqueId}-neon`} x="-100%" y="-100%" width="300%" height="300%">
            {isDesktop ? (
              <>
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur3" />
                <feMerge>
                  <feMergeNode in="blur3" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </>
            ) : (
              <>
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </>
            )}
          </filter>
        </defs>
        
        {/* Outer glow layer */}
        <path
          d="M50 26 L30 74 M50 26 L70 74 M38 58 L62 58"
          fill="none"
          stroke="hsl(262 83% 58% / 0.3)"
          strokeWidth={isDesktop ? "10" : "8"}
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
      
      {/* Outer bubble ring - animated on desktop, static on mobile */}
      {isDesktop ? (
        <motion.div
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
          animate={{
            scale: [1, 1.008, 1],
            opacity: [0.6, 0.85, 0.6],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'hsl(0 0% 100% / 0.12)',
            borderBottomColor: 'hsl(var(--primary) / 0.15)',
            boxShadow: `
              0 0 ${size * 0.1}px hsl(var(--primary) / 0.08),
              inset 0 0 ${size * 0.08}px hsl(var(--primary) / 0.03)
            `,
            zIndex: 30,
          }}
        />
      )}
      
      {/* Secondary bubble ring */}
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
 * Desktop: Animated ambient glow
 * Mobile: Static glow for performance
 */
export const AuroraLogoHero = ({ size = 260 }: { size?: number }) => {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = !isMobile && !prefersReducedMotion;
  
  return (
    <div
      className="relative flex items-center justify-center mx-auto w-full"
      style={{ maxWidth: size, aspectRatio: '1/1' }}
    >
      {/* Ambient glow - animated on desktop, static on mobile */}
      {isDesktop ? (
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, hsl(280 50% 20% / 0.1) 40%, transparent 70%)',
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [2.2, 2.5, 2.2],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <div
          className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, hsl(280 50% 20% / 0.06) 40%, transparent 70%)',
            transform: 'scale(2)',
            opacity: 0.35,
          }}
        />
      )}
      
      {/* Nebula cloud effect - DESKTOP ONLY */}
      {isDesktop && (
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 25% 75%, hsl(180 70% 50% / 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 50% 70% at 75% 25%, hsl(280 60% 50% / 0.06) 0%, transparent 50%)
            `,
            transform: 'scale(1.8)',
          }}
          animate={{
            rotate: [0, 10, 0, -10, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      
      {/* The logo - centered properly */}
      <AuroraLogo size={size} animated={true} className="relative z-10" />
    </div>
  );
};

export default AuroraLogo;
