import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // Get theme colors based on saved preference
  const colors = useMemo(() => {
    const savedTheme = getSavedTheme();
    return themeColors[savedTheme] || themeColors['dark'];
  }, []);
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    // Phase 1: Rings appear and pulse (0ms)
    // Phase 2: Logo reveals (600ms)
    timers.push(setTimeout(() => setPhase('logo'), 600));
    // Phase 3: Text fades in (1200ms)
    timers.push(setTimeout(() => setPhase('text'), 1200));
    // Phase 4: Everything fades out (2200ms)
    timers.push(setTimeout(() => setPhase('fade'), minimumDuration - 300));
    // Complete (2500ms)
    timers.push(setTimeout(onComplete, minimumDuration));
    
    return () => timers.forEach(clearTimeout);
  }, [onComplete, minimumDuration]);

  return (
    <AnimatePresence>
      {phase !== 'fade' ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{ background: colors.bg }}
        >
          {/* Animated gradient orbs - theme aware */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)` }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 20, 0],
              y: [0, -20, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)` }}
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.25, 0.4, 0.25],
              x: [0, -20, 0],
              y: [0, 20, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          {/* Center content container */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Aura rings */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgba(139, 92, 246, 0.4), transparent, rgba(59, 130, 246, 0.4), transparent)',
                  padding: '2px'
                }}
                initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  rotate: 360 
                }}
                transition={{ 
                  opacity: { duration: 0.5 },
                  scale: { duration: 0.6, ease: 'backOut' },
                  rotate: { duration: 8, repeat: Infinity, ease: 'linear' }
                }}
              >
                <div 
                  className="w-full h-full rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0c0a14, #1a1625)' }}
                />
              </motion.div>

              {/* Middle ring */}
              <motion.div
                className="absolute inset-3 rounded-full"
                style={{
                  background: 'conic-gradient(from 180deg, transparent, rgba(168, 85, 247, 0.5), transparent, rgba(99, 102, 241, 0.5), transparent)',
                  padding: '2px'
                }}
                initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  rotate: -360 
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 0.1 },
                  scale: { duration: 0.6, ease: 'backOut', delay: 0.1 },
                  rotate: { duration: 6, repeat: Infinity, ease: 'linear' }
                }}
              >
                <div 
                  className="w-full h-full rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0c0a14, #1a1625)' }}
                />
              </motion.div>

              {/* Inner ring */}
              <motion.div
                className="absolute inset-6 rounded-full"
                style={{
                  background: 'conic-gradient(from 90deg, transparent, rgba(139, 92, 246, 0.6), transparent)',
                  padding: '2px'
                }}
                initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  rotate: 360 
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 0.2 },
                  scale: { duration: 0.6, ease: 'backOut', delay: 0.2 },
                  rotate: { duration: 4, repeat: Infinity, ease: 'linear' }
                }}
              >
                <div 
                  className="w-full h-full rounded-full"
                  style={{ background: 'linear-gradient(135deg, #0c0a14, #1a1625)' }}
                />
              </motion.div>

              {/* Center glow */}
              <motion.div
                className="absolute inset-9 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)'
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.7, 0.4]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Logo "A" */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0 }}
                animate={phase !== 'rings' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ 
                  duration: 0.5, 
                  ease: 'backOut'
                }}
              >
                <span 
                  className="text-5xl font-bold"
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
              className="mt-8 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={phase === 'text' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <h1 
                className="text-3xl font-semibold tracking-wide"
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
              className="mt-2 text-sm tracking-widest uppercase"
              style={{ color: colors.text }}
              initial={{ opacity: 0 }}
              animate={phase === 'text' ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Your Unified Workspace
            </motion.p>

            {/* Loading dots */}
            <motion.div
              className="mt-8 flex gap-2"
              initial={{ opacity: 0 }}
              animate={phase === 'text' ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'rgba(139, 92, 246, 0.6)' }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
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
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
