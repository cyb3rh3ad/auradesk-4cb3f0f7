import { motion } from 'framer-motion';

interface AuroraLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Magical space-like AuraBubble logo with cosmic effects
 */
export const AuroraLogo = ({ size = 160, className = '', animated = true }: AuroraLogoProps) => {
  const uniqueId = `aurora-logo-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer rotating nebula ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, 
            transparent 0deg, 
            hsl(var(--primary) / 0.3) 60deg, 
            hsl(180 80% 50% / 0.4) 120deg, 
            hsl(280 70% 60% / 0.3) 180deg, 
            transparent 240deg,
            hsl(var(--primary) / 0.2) 300deg,
            transparent 360deg
          )`,
          filter: 'blur(8px)',
        }}
        animate={animated ? {
          rotate: [0, 360],
        } : undefined}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Inner counter-rotating aurora */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          background: `conic-gradient(from 180deg, 
            transparent 0deg, 
            hsl(170 80% 45% / 0.4) 90deg, 
            transparent 180deg,
            hsl(260 70% 55% / 0.3) 270deg,
            transparent 360deg
          )`,
          filter: 'blur(6px)',
        }}
        animate={animated ? {
          rotate: [360, 0],
        } : undefined}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Pulsing core glow */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
        }}
        animate={animated ? {
          opacity: [0.5, 0.8, 0.5],
          scale: [0.9, 1.1, 0.9],
        } : undefined}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Floating particles/stars */}
      {animated && [0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size * 0.02,
            height: size * 0.02,
            background: 'hsl(var(--primary))',
            boxShadow: '0 0 4px hsl(var(--primary))',
            left: '50%',
            top: '50%',
          }}
          animate={{
            x: [
              Math.cos((i * 60) * Math.PI / 180) * size * 0.35,
              Math.cos((i * 60 + 180) * Math.PI / 180) * size * 0.4,
              Math.cos((i * 60 + 360) * Math.PI / 180) * size * 0.35,
            ],
            y: [
              Math.sin((i * 60) * Math.PI / 180) * size * 0.35,
              Math.sin((i * 60 + 180) * Math.PI / 180) * size * 0.4,
              Math.sin((i * 60 + 360) * Math.PI / 180) * size * 0.35,
            ],
            opacity: [0.4, 1, 0.4],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 8 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}
      
      {/* The A monogram - wider, rounded edges, more transparent */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: `drop-shadow(0 0 ${size * 0.06}px hsl(var(--primary) / 0.6))` }}
      >
        <defs>
          {/* Cosmic gradient for the A */}
          <linearGradient id={`${uniqueId}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.75)" />
            <stop offset="40%" stopColor="hsl(280 70% 65% / 0.7)" />
            <stop offset="100%" stopColor="hsl(180 80% 55% / 0.75)" />
          </linearGradient>
          
          {/* Rounded corners filter */}
          <filter id={`${uniqueId}-round`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="round" />
            <feComposite in="SourceGraphic" in2="round" operator="atop" />
          </filter>
          
          {/* Combined glow + round effect */}
          <filter id={`${uniqueId}-glow`}>
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* The A shape - rounded, soft edges, 0.75 opacity */}
        <path
          d="M50 18 Q48 16 50 16 Q52 16 50 18 L18 82 Q16 86 20 84 L34 84 Q36 84 37 82 L42 68 Q43 66 45 66 L55 66 Q57 66 58 68 L63 82 Q64 84 66 84 L80 84 Q84 86 82 82 L50 18 Z M50 42 Q48 40 50 40 Q52 40 50 42 L54 52 Q55 54 53 54 L47 54 Q45 54 46 52 L50 42 Z"
          fill={`url(#${uniqueId}-gradient)`}
          fillRule="evenodd"
          filter={`url(#${uniqueId}-glow)`}
          opacity="0.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Outer bubble ring - breathing effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: '1px solid hsl(var(--primary) / 0.3)',
          boxShadow: `
            0 0 ${size * 0.1}px hsl(var(--primary) / 0.1),
            inset 0 0 ${size * 0.08}px hsl(var(--primary) / 0.05)
          `,
        }}
        animate={animated ? {
          scale: [1, 1.02, 1],
          opacity: [0.5, 0.8, 0.5],
        } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Secondary bubble ring - offset timing */}
      <motion.div
        className="absolute inset-1 rounded-full"
        style={{
          border: '1px solid hsl(180 70% 50% / 0.15)',
        }}
        animate={animated ? {
          scale: [1.02, 1, 1.02],
          opacity: [0.3, 0.6, 0.3],
        } : undefined}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
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
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, hsl(280 60% 30% / 0.1) 50%, transparent 70%)',
          transform: 'scale(2.5)',
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [2.2, 2.8, 2.2],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Nebula cloud effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 30% 70%, hsl(180 70% 50% / 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 70% 30%, hsl(280 60% 50% / 0.12) 0%, transparent 50%)
          `,
          transform: 'scale(1.8)',
        }}
        animate={{
          rotate: [0, 10, 0, -10, 0],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* The logo */}
      <AuroraLogo size={size} animated={true} className="relative" />
    </motion.div>
  );
};

export default AuroraLogo;
