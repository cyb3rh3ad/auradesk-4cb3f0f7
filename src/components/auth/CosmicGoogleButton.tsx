import { motion } from "framer-motion";
import { useState } from "react";

interface CosmicGoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * A cosmic-styled Google sign-in button that matches the AuraDesk aesthetic
 */
export const CosmicGoogleButton = ({ onClick, loading, disabled }: CosmicGoogleButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const uniqueId = `google-cosmic-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-11 rounded-lg overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Deep space background */}
      <div 
        className="absolute inset-0 transition-all duration-500"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, hsl(0 0% 100% / 0.05) 0%, transparent 50%),
            linear-gradient(135deg, 
              hsl(240 20% 8% / 0.95) 0%, 
              hsl(260 25% 12% / 0.9) 50%, 
              hsl(240 20% 8% / 0.95) 100%
            )
          `,
        }}
      />
      
      {/* Aurora border glow - blue-green-cyan */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: `linear-gradient(135deg, 
            hsl(180 85% 55% / ${isHovered ? 0.7 : 0.35}) 0%, 
            hsl(165 80% 50% / ${isHovered ? 0.6 : 0.3}) 25%,
            hsl(200 85% 55% / ${isHovered ? 0.65 : 0.32}) 50%, 
            hsl(220 80% 60% / ${isHovered ? 0.6 : 0.3}) 75%,
            hsl(190 85% 55% / ${isHovered ? 0.7 : 0.35}) 100%
          )`,
          padding: '1.5px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          opacity: isHovered ? 1 : 0.7,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Animated aurora sweep - blue-green shimmer */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, 
            transparent 0%, 
            hsl(175 80% 55% / 0.2) 25%,
            hsl(195 85% 55% / 0.18) 50%, 
            hsl(175 80% 55% / 0.2) 75%,
            transparent 100%
          )`,
        }}
        animate={isHovered ? {
          x: ['-100%', '200%'],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Content container */}
      <div className="relative flex items-center justify-center gap-3 h-full px-4">
        {/* Cosmic Google Logo SVG */}
        <motion.svg 
          viewBox="0 0 24 24" 
          className="w-5 h-5"
          animate={{
            filter: isHovered ? 'drop-shadow(0 0 8px hsl(var(--primary)))' : 'none',
          }}
          transition={{ duration: 0.3 }}
        >
          <defs>
            {/* Aurora gradient for G - blue-green-cyan spectrum */}
            <linearGradient id={`${uniqueId}-cosmic`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(180, 85%, 60%)" />
              <stop offset="33%" stopColor="hsl(165, 80%, 55%)" />
              <stop offset="66%" stopColor="hsl(200, 85%, 60%)" />
              <stop offset="100%" stopColor="hsl(190, 80%, 55%)" />
            </linearGradient>
            
            {/* Neon glow filter */}
            <filter id={`${uniqueId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Google G path with cosmic styling */}
          <motion.path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill={isHovered ? `url(#${uniqueId}-cosmic)` : "hsl(217, 89%, 61%)"}
            filter={isHovered ? `url(#${uniqueId}-glow)` : undefined}
          />
          <motion.path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill={isHovered ? `url(#${uniqueId}-cosmic)` : "hsl(142, 71%, 45%)"}
            filter={isHovered ? `url(#${uniqueId}-glow)` : undefined}
          />
          <motion.path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill={isHovered ? `url(#${uniqueId}-cosmic)` : "hsl(45, 93%, 47%)"}
            filter={isHovered ? `url(#${uniqueId}-glow)` : undefined}
          />
          <motion.path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill={isHovered ? `url(#${uniqueId}-cosmic)` : "hsl(4, 90%, 58%)"}
            filter={isHovered ? `url(#${uniqueId}-glow)` : undefined}
          />
        </motion.svg>
        
        {/* Text with aurora glow - blue-green gradient */}
        <motion.span
          className="text-sm font-medium"
          style={{
            background: isHovered 
              ? 'linear-gradient(90deg, hsl(180, 85%, 70%), hsl(165, 80%, 65%), hsl(200, 85%, 70%))' 
              : 'none',
            WebkitBackgroundClip: isHovered ? 'text' : 'unset',
            WebkitTextFillColor: isHovered ? 'transparent' : 'hsl(0 0% 95%)',
            color: 'hsl(0 0% 95%)',
          }}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </motion.span>
      </div>
      
      {/* Floating particles on hover - aurora colors */}
      {isHovered && (
        <>
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3 + Math.random() * 2,
                height: 3 + Math.random() * 2,
                background: ['hsl(180, 85%, 60%)', 'hsl(165, 80%, 55%)', 'hsl(200, 85%, 60%)', 'hsl(190, 80%, 55%)'][i],
                left: `${15 + i * 20}%`,
                top: '50%',
              }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                y: [0, -15, -30],
                x: [0, (i - 1.5) * 5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}
    </motion.button>
  );
};

export default CosmicGoogleButton;
