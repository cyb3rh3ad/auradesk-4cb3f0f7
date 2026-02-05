import { motion } from 'framer-motion';

interface AuroraLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * A true cutout logo - the "A" is a mask that reveals the page background,
 * with animated aurora waves behind it. No sticker effect, fully integrated.
 */
export const AuroraLogo = ({ size = 160, className = '', animated = true }: AuroraLogoProps) => {
  const uniqueId = `aurora-logo-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Aurora waves layer - sits BEHIND the A, visible through the cutout */}
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 30% 80%, hsl(var(--primary) / 0.6) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 70% 60%, hsl(180 70% 50% / 0.5) 0%, transparent 40%),
            radial-gradient(ellipse 80% 100% at 50% 30%, hsl(280 60% 60% / 0.4) 0%, transparent 50%)
          `,
        }}
        animate={animated ? {
          opacity: [0.7, 0.9, 0.7],
          scale: [1, 1.05, 1],
        } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Secondary aurora shimmer */}
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 20% 70%, hsl(170 80% 45% / 0.5) 0%, transparent 40%),
            radial-gradient(ellipse 70% 50% at 80% 40%, hsl(260 70% 55% / 0.4) 0%, transparent 35%)
          `,
        }}
        animate={animated ? {
          opacity: [0.5, 0.8, 0.5],
          rotate: [0, 5, 0],
        } : undefined}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      
      {/* The A monogram - rendered as a proper SVG shape, centered */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ filter: `drop-shadow(0 0 ${size * 0.08}px hsl(var(--primary) / 0.5))` }}
      >
        <defs>
          {/* Gradient for the A stroke */}
          <linearGradient id={`${uniqueId}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--primary) / 0.9)" />
            <stop offset="100%" stopColor="hsl(180 70% 60%)" />
          </linearGradient>
        </defs>
        
        {/* The A shape - MUCH thicker strokes, perfectly centered */}
        <path
          d="M50 12 L18 88 L34 88 L40 72 L60 72 L66 88 L82 88 L50 12 Z M50 42 L55 60 L45 60 L50 42 Z"
          fill={`url(#${uniqueId}-gradient)`}
          fillRule="evenodd"
        />
      </svg>
      
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: '1px solid hsl(var(--primary) / 0.2)',
          boxShadow: `
            0 0 ${size * 0.15}px hsl(var(--primary) / 0.15),
            inset 0 0 ${size * 0.1}px hsl(var(--primary) / 0.1)
          `,
        }}
        animate={animated ? {
          opacity: [0.5, 0.8, 0.5],
        } : undefined}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

/**
 * Hero version with enhanced ambient effects for landing page - CENTERED
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
      {/* Large ambient glow - perfectly centered */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          transform: 'scale(2)',
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1.8, 2.2, 1.8],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Secondary color glow - also centered */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: 'radial-gradient(circle, hsl(180 70% 50% / 0.15) 0%, transparent 60%)',
          transform: 'scale(1.5)',
        }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* The logo - centered */}
      <AuroraLogo size={size} animated={true} className="relative" />
    </motion.div>
  );
};

export default AuroraLogo;
