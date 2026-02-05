import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
}

// Theme color configurations for splash screen
const themeColors: Record<string, { bg: string; primary: string; secondary: string; text: string }> = {
  'dark': {
    bg: 'linear-gradient(135deg, #0c0a14 0%, #1a1625 50%, #0f0d1a 100%)',
    primary: 'rgba(139, 92, 246, 0.4)',
    secondary: 'rgba(59, 130, 246, 0.25)',
    text: 'rgba(255, 255, 255, 0.4)',
  },
  'theme-discord-dark': {
    bg: 'linear-gradient(135deg, #202225 0%, #2f3136 50%, #36393f 100%)',
    primary: 'rgba(88, 101, 242, 0.4)',
    secondary: 'rgba(87, 242, 135, 0.25)',
    text: 'rgba(255, 255, 255, 0.5)',
  },
  'theme-midnight': {
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    primary: 'rgba(99, 102, 241, 0.4)',
    secondary: 'rgba(139, 92, 246, 0.25)',
    text: 'rgba(226, 232, 240, 0.5)',
  },
  'theme-forest': {
    bg: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)',
    primary: 'rgba(34, 197, 94, 0.4)',
    secondary: 'rgba(16, 185, 129, 0.25)',
    text: 'rgba(187, 247, 208, 0.5)',
  },
  'theme-sunset': {
    bg: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
    primary: 'rgba(251, 146, 60, 0.4)',
    secondary: 'rgba(244, 63, 94, 0.25)',
    text: 'rgba(254, 215, 170, 0.5)',
  },
  'theme-purple': {
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
    primary: 'rgba(167, 139, 250, 0.4)',
    secondary: 'rgba(192, 132, 252, 0.25)',
    text: 'rgba(221, 214, 254, 0.5)',
  },
  'light': {
    bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
    primary: 'rgba(139, 92, 246, 0.5)',
    secondary: 'rgba(59, 130, 246, 0.3)',
    text: 'rgba(71, 85, 105, 0.7)',
  },
};

// Get saved theme from localStorage
const getSavedTheme = (): string => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('auradesk-theme');
    return saved || 'dark';
  } catch {
    return 'dark';
  }
};

export const SplashScreen = ({ onComplete, minimumDuration = 2500 }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'rings' | 'logo' | 'text' | 'fade'>('rings');
  const prefersReducedMotion = useReducedMotion();
  
  // Get theme colors based on saved preference
  const colors = useMemo(() => {
    const savedTheme = getSavedTheme();
    return themeColors[savedTheme] || themeColors['dark'];
  }, []);
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    // Faster, simpler timing for reduced motion or better performance
    const timing = prefersReducedMotion 
      ? { logo: 200, text: 400, fade: 800, complete: 1000 }
      : { logo: 500, text: 900, fade: minimumDuration - 400, complete: minimumDuration };
    
    timers.push(setTimeout(() => setPhase('logo'), timing.logo));
    timers.push(setTimeout(() => setPhase('text'), timing.text));
    timers.push(setTimeout(() => setPhase('fade'), timing.fade));
    timers.push(setTimeout(onComplete, timing.complete));
    
    return () => timers.forEach(clearTimeout);
  }, [onComplete, minimumDuration, prefersReducedMotion]);

  // Simplified animation variants for better mobile performance
  const ringAnimation = prefersReducedMotion ? {} : {
    rotate: 360,
  };
  
  const ringTransition = (duration: number, delay: number = 0) => ({
    opacity: { duration: 0.3 },
    scale: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const },
    rotate: { duration, repeat: Infinity, ease: [0, 0, 1, 1] as const }
  } as const);

  return (
    <AnimatePresence>
      {phase !== 'fade' ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden will-change-transform"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ background: colors.bg }}
        >
          {/* Animated gradient orbs - simplified for performance */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl will-change-opacity"
            style={{ background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)` }}
            animate={prefersReducedMotion ? { opacity: 0.4 } : {
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-56 h-56 md:w-80 md:h-80 rounded-full blur-3xl will-change-opacity"
            style={{ background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)` }}
            animate={prefersReducedMotion ? { opacity: 0.3 } : {
              opacity: [0.25, 0.4, 0.25],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />

          {/* Center content container */}
          <div className="relative flex flex-col items-center justify-center will-change-transform">
            {/* Aura rings - optimized with will-change and simpler animations */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 rounded-full will-change-transform"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgba(139, 92, 246, 0.4), transparent, rgba(59, 130, 246, 0.4), transparent)',
                  padding: '2px'
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, ...ringAnimation }}
                transition={ringTransition(8)}
              >
                <div 
                  className="w-full h-full rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0c0a14, #1a1625)' }}
                />
              </motion.div>

              {/* Middle ring */}
              <motion.div
                className="absolute inset-2 md:inset-3 rounded-full will-change-transform"
                style={{
                  background: 'conic-gradient(from 180deg, transparent, rgba(168, 85, 247, 0.5), transparent, rgba(99, 102, 241, 0.5), transparent)',
                  padding: '2px'
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, rotate: prefersReducedMotion ? 0 : -360 }}
                transition={ringTransition(6, 0.05)}
              >
                <div 
                  className="w-full h-full rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0c0a14, #1a1625)' }}
                />
              </motion.div>

              {/* Inner ring */}
              <motion.div
                className="absolute inset-5 md:inset-6 rounded-full will-change-transform"
                style={{
                  background: 'conic-gradient(from 90deg, transparent, rgba(139, 92, 246, 0.6), transparent)',
                  padding: '2px'
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, ...ringAnimation }}
                transition={ringTransition(4, 0.1)}
              >
                <div 
                  className="w-full h-full rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0c0a14, #1a1625)' }}
                />
              </motion.div>

              {/* Center glow */}
              <motion.div
                className="absolute inset-7 md:inset-9 rounded-full will-change-opacity"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)'
                }}
                animate={prefersReducedMotion ? { opacity: 0.5 } : {
                  opacity: [0.4, 0.6, 0.4]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Logo "A" */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0 }}
                animate={phase !== 'rings' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <span 
                  className="text-4xl md:text-5xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))'
                  }}
                >
                  A
                </span>
              </motion.div>
            </div>

            {/* Brand name */}
            <motion.div
              className="mt-6 md:mt-8 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={phase === 'text' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <h1 
                className="text-2xl md:text-3xl font-semibold tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #f0f0f0 0%, #a0a0a0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                AuraDesk
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="mt-1.5 md:mt-2 text-xs md:text-sm tracking-widest uppercase"
              style={{ color: colors.text }}
              initial={{ opacity: 0 }}
              animate={phase === 'text' ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              Your Unified Workspace
            </motion.p>

            {/* Loading dots */}
            <motion.div
              className="mt-6 md:mt-8 flex gap-1.5 md:gap-2"
              initial={{ opacity: 0 }}
              animate={phase === 'text' ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                  style={{ background: 'rgba(139, 92, 246, 0.6)' }}
                  animate={prefersReducedMotion ? { opacity: 0.7 } : {
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut'
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Bottom accent line */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.5), transparent)'
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
