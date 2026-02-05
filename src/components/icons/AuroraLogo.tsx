import { motion } from 'framer-motion';

interface AuroraLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Magical space-like AuraBubble logo with neon outlined "A"
 */
export const AuroraLogo = ({ size = 160, className = '', animated = true }: AuroraLogoProps) => {
  const uniqueId = `aurora-logo-${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate particle positions
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) + Math.random() * 15,
    radius: 0.32 + Math.random() * 0.12,
    size: 0.015 + Math.random() * 0.01,
    duration: 6 + Math.random() * 4,
    delay: i * 0.2,
  }));
  
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
        animate={animated ? {
          rotate: [0, 360],
        } : undefined}
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
        animate={animated ? {
          rotate: [360, 0],
        } : undefined}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Third layer - slower, different colors */}
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
        animate={animated ? {
          rotate: [0, -360],
        } : undefined}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Pulsing core glow */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, hsl(280 50% 30% / 0.05) 50%, transparent 70%)',
        }}
        animate={animated ? {
          opacity: [0.4, 0.7, 0.4],
          scale: [0.95, 1.05, 0.95],
        } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Floating particles/stars - more of them! */}
      {animated && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: size * p.size,
            height: size * p.size,
            background: p.id % 3 === 0 
              ? 'hsl(var(--primary))' 
              : p.id % 3 === 1 
                ? 'hsl(180 80% 60%)' 
                : 'hsl(280 70% 70%)',
            boxShadow: `0 0 ${size * 0.02}px currentColor`,
            left: '50%',
            top: '50%',
          }}
          animate={{
            x: [
              Math.cos(p.angle * Math.PI / 180) * size * p.radius,
              Math.cos((p.angle + 120) * Math.PI / 180) * size * (p.radius + 0.05),
              Math.cos((p.angle + 240) * Math.PI / 180) * size * p.radius,
              Math.cos((p.angle + 360) * Math.PI / 180) * size * p.radius,
            ],
            y: [
              Math.sin(p.angle * Math.PI / 180) * size * p.radius,
              Math.sin((p.angle + 120) * Math.PI / 180) * size * (p.radius + 0.05),
              Math.sin((p.angle + 240) * Math.PI / 180) * size * p.radius,
              Math.sin((p.angle + 360) * Math.PI / 180) * size * p.radius,
            ],
            opacity: [0.3, 0.9, 0.5, 0.3],
            scale: [0.8, 1.3, 1, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
      
      {/* Tiny twinkling stars */}
      {animated && Array.from({ length: 8 }, (_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute rounded-full"
          style={{
            width: size * 0.008,
            height: size * 0.008,
            background: 'white',
            boxShadow: '0 0 2px white',
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        />
      ))}
      
      {/* The A monogram - THICC NEON STYLE */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Neon glow gradient for stroke */}
          <linearGradient id={`${uniqueId}-stroke`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(280 80% 70%)" />
            <stop offset="50%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(180 80% 60%)" />
          </linearGradient>
          
          {/* Strong multi-layer neon glow */}
          <filter id={`${uniqueId}-neon`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer glow layer */}
        <path
          d="M50 26 L30 74 M50 26 L70 74 M38 58 L62 58"
          fill="none"
          stroke="hsl(var(--primary) / 0.3)"
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
      
      {/* Outer bubble ring - breathing effect with 3D border */}
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
        }}
        animate={animated ? {
          scale: [1, 1.01, 1],
          opacity: [0.6, 0.9, 0.6],
        } : undefined}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Secondary bubble ring - inner glass effect */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          border: '1px solid transparent',
          borderTopColor: 'hsl(280 60% 70% / 0.1)',
          borderBottomColor: 'hsl(180 70% 50% / 0.08)',
        }}
        animate={animated ? {
          scale: [1.005, 0.995, 1.005],
          opacity: [0.3, 0.6, 0.3],
        } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      
      {/* Inner glow ring */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          boxShadow: `inset 0 0 ${size * 0.08}px hsl(var(--primary) / 0.1)`,
        }}
        animate={animated ? {
          opacity: [0.3, 0.5, 0.3],
        } : undefined}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </div>
  );
};

/**
 * Hero version with enhanced cosmic ambient effects
 */
export const AuroraLogoHero = ({ size = 260 }: { size?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      className="relative flex items-center justify-center mx-auto"
      style={{ width: size, height: size }}
    >
      {/* Deep space ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, hsl(280 50% 20% / 0.1) 40%, hsl(220 40% 10% / 0.05) 70%, transparent 100%)',
          transform: 'scale(2.8)',
        }}
        animate={{
          opacity: [0.25, 0.5, 0.25],
          scale: [2.5, 3, 2.5],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Nebula cloud effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 25% 75%, hsl(180 70% 50% / 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 70% at 75% 25%, hsl(280 60% 50% / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 60% at 50% 50%, hsl(var(--primary) / 0.06) 0%, transparent 60%)
          `,
          transform: 'scale(2)',
        }}
        animate={{
          rotate: [0, 15, 0, -15, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* The logo */}
      <AuroraLogo size={size} animated={true} className="relative" />
    </motion.div>
  );
};

export default AuroraLogo;
