import { useState, useEffect, useMemo } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
}

// Theme color configurations for splash screen
const themeColors: Record<string, { bg: string; primary: string; secondary: string; text: string }> = {
  'dark': {
    bg: '#0c0a14',
    primary: 'rgba(139, 92, 246, 0.4)',
    secondary: 'rgba(59, 130, 246, 0.25)',
    text: 'rgba(255, 255, 255, 0.5)',
  },
  'theme-discord-dark': {
    bg: '#202225',
    primary: 'rgba(88, 101, 242, 0.4)',
    secondary: 'rgba(87, 242, 135, 0.25)',
    text: 'rgba(255, 255, 255, 0.5)',
  },
  'theme-midnight': {
    bg: '#0f172a',
    primary: 'rgba(99, 102, 241, 0.4)',
    secondary: 'rgba(139, 92, 246, 0.25)',
    text: 'rgba(226, 232, 240, 0.5)',
  },
  'theme-forest': {
    bg: '#052e16',
    primary: 'rgba(34, 197, 94, 0.4)',
    secondary: 'rgba(16, 185, 129, 0.25)',
    text: 'rgba(187, 247, 208, 0.5)',
  },
  'theme-sunset': {
    bg: '#1c1917',
    primary: 'rgba(251, 146, 60, 0.4)',
    secondary: 'rgba(244, 63, 94, 0.25)',
    text: 'rgba(254, 215, 170, 0.5)',
  },
  'theme-purple': {
    bg: '#1e1b4b',
    primary: 'rgba(167, 139, 250, 0.4)',
    secondary: 'rgba(192, 132, 252, 0.25)',
    text: 'rgba(221, 214, 254, 0.5)',
  },
  'light': {
    bg: '#f8fafc',
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

export const SplashScreen = ({ onComplete, minimumDuration = 2000 }: SplashScreenProps) => {
  const [phase, setPhase] = useState(0); // 0: initial, 1: logo, 2: text, 3: fade out
  const [isExiting, setIsExiting] = useState(false);
  
  // Get theme colors based on saved preference
  const colors = useMemo(() => {
    const savedTheme = getSavedTheme();
    return themeColors[savedTheme] || themeColors['dark'];
  }, []);
  
  useEffect(() => {
    // Simple, sequential timing without framer-motion overhead
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 400);
    const t3 = setTimeout(() => setIsExiting(true), minimumDuration - 300);
    const t4 = setTimeout(onComplete, minimumDuration);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete, minimumDuration]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 300ms ease-out',
      }}
    >
      {/* Static gradient orbs - no animation, just atmosphere */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl"
        style={{ 
          background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)`,
          opacity: 0.5,
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-56 h-56 md:w-80 md:h-80 rounded-full blur-3xl"
        style={{ 
          background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)`,
          opacity: 0.4,
        }}
      />

      {/* Center content container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Logo ring container */}
        <div 
          className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.8)',
            transition: 'opacity 400ms ease-out, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Single rotating ring - CSS animation instead of framer-motion */}
          <div
            className="absolute inset-0 rounded-full animate-spin-slow"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(139, 92, 246, 0.5), transparent, rgba(59, 130, 246, 0.5), transparent)',
              padding: '2px',
            }}
          >
            <div 
              className="w-full h-full rounded-full"
              style={{ backgroundColor: colors.bg }}
            />
          </div>

          {/* Inner glow */}
          <div
            className="absolute inset-4 md:inset-5 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            }}
          />

          {/* Logo "A" */}
          <span 
            className="relative text-4xl md:text-5xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))',
            }}
          >
            A
          </span>
        </div>

        {/* Brand name */}
        <h1 
          className="mt-6 md:mt-8 text-2xl md:text-3xl font-semibold tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #f0f0f0 0%, #a0a0a0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 300ms ease-out, transform 300ms ease-out',
          }}
        >
          AuraDesk
        </h1>

        {/* Tagline */}
        <p
          className="mt-1.5 md:mt-2 text-xs md:text-sm tracking-widest uppercase"
          style={{ 
            color: colors.text,
            opacity: phase >= 2 ? 1 : 0,
            transition: 'opacity 300ms ease-out 100ms',
          }}
        >
          Your Unified Workspace
        </p>

        {/* Loading indicator - simple CSS animation */}
        <div
          className="mt-6 md:mt-8 flex gap-1.5"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transition: 'opacity 200ms ease-out 150ms',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse-dot"
              style={{ 
                backgroundColor: 'rgba(139, 92, 246, 0.7)',
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.5), transparent)',
          transform: phase >= 1 ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 800ms ease-out 200ms',
        }}
      />

      {/* CSS for animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-pulse-dot {
          animation: pulse-dot 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
