import { useState, useEffect, useMemo } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
}

// Theme color configurations for splash screen
const themeColors: Record<string, { bg: string; primary: string; secondary: string; accent: string; text: string }> = {
  'dark': {
    bg: '#0c0a14',
    primary: 'rgba(139, 92, 246, 0.5)',
    secondary: 'rgba(6, 182, 212, 0.35)',
    accent: 'rgba(236, 72, 153, 0.2)',
    text: 'rgba(255, 255, 255, 0.5)',
  },
  'theme-discord-dark': {
    bg: '#202225',
    primary: 'rgba(88, 101, 242, 0.5)',
    secondary: 'rgba(87, 242, 135, 0.35)',
    accent: 'rgba(254, 215, 170, 0.2)',
    text: 'rgba(255, 255, 255, 0.5)',
  },
  'theme-midnight': {
    bg: '#0f172a',
    primary: 'rgba(99, 102, 241, 0.5)',
    secondary: 'rgba(139, 92, 246, 0.35)',
    accent: 'rgba(56, 189, 248, 0.2)',
    text: 'rgba(226, 232, 240, 0.5)',
  },
  'theme-forest': {
    bg: '#052e16',
    primary: 'rgba(34, 197, 94, 0.5)',
    secondary: 'rgba(16, 185, 129, 0.35)',
    accent: 'rgba(163, 230, 53, 0.2)',
    text: 'rgba(187, 247, 208, 0.5)',
  },
  'theme-sunset': {
    bg: '#1c1917',
    primary: 'rgba(251, 146, 60, 0.5)',
    secondary: 'rgba(244, 63, 94, 0.35)',
    accent: 'rgba(251, 191, 36, 0.2)',
    text: 'rgba(254, 215, 170, 0.5)',
  },
  'theme-purple': {
    bg: '#1e1b4b',
    primary: 'rgba(167, 139, 250, 0.5)',
    secondary: 'rgba(192, 132, 252, 0.35)',
    accent: 'rgba(99, 102, 241, 0.2)',
    text: 'rgba(221, 214, 254, 0.5)',
  },
  'light': {
    bg: '#f8fafc',
    primary: 'rgba(139, 92, 246, 0.5)',
    secondary: 'rgba(6, 182, 212, 0.3)',
    accent: 'rgba(236, 72, 153, 0.15)',
    text: 'rgba(71, 85, 105, 0.7)',
  },
};

const getSavedTheme = (): string => {
  if (typeof window === 'undefined') return 'dark';
  try {
    return localStorage.getItem('auradesk-theme') || 'dark';
  } catch {
    return 'dark';
  }
};

export const SplashScreen = ({ onComplete, minimumDuration = 2200 }: SplashScreenProps) => {
  const [phase, setPhase] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  
  const colors = useMemo(() => {
    const saved = getSavedTheme();
    return themeColors[saved] || themeColors['dark'];
  }, []);
  
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 350);
    const t3 = setTimeout(() => setPhase(3), 700);
    const t4 = setTimeout(() => setIsExiting(true), minimumDuration - 400);
    const t5 = setTimeout(onComplete, minimumDuration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onComplete, minimumDuration]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 400ms ease-out',
      }}
    >
      {/* Animated nebula orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px] animate-splash-orb-1"
        style={{
          background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)`,
          top: '15%', left: '10%',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] animate-splash-orb-2"
        style={{
          background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)`,
          bottom: '15%', right: '10%',
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-[60px] animate-splash-orb-3"
        style={{
          background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)`,
          top: '30%', right: '25%',
        }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center justify-center">
        
        {/* AuraBubble logo container */}
        <div 
          className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.6)',
            transition: 'opacity 500ms ease-out, transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Outer rotating aura ring */}
          <div
            className="absolute inset-0 rounded-full animate-splash-ring-outer"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(192,132,252,0.5) 60deg, transparent 120deg, rgba(34,211,238,0.4) 200deg, transparent 280deg, rgba(139,92,246,0.45) 340deg, transparent 360deg)',
              padding: '2px',
            }}
          >
            <div className="w-full h-full rounded-full" style={{ backgroundColor: colors.bg }} />
          </div>

          {/* Inner counter-rotating ring */}
          <div
            className="absolute inset-3 md:inset-4 rounded-full animate-splash-ring-inner"
            style={{
              background: 'conic-gradient(from 180deg, transparent 0deg, rgba(6,182,212,0.35) 90deg, transparent 180deg, rgba(168,85,247,0.3) 270deg, transparent 360deg)',
              padding: '1.5px',
            }}
          >
            <div className="w-full h-full rounded-full" style={{ backgroundColor: colors.bg }} />
          </div>

          {/* Pulsing core glow */}
          <div
            className="absolute inset-6 md:inset-8 rounded-full animate-splash-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(6,182,212,0.15) 50%, transparent 70%)',
            }}
          />

          {/* Glass-morphic bubble overlay */}
          <div
            className="absolute inset-4 md:inset-5 rounded-full"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 40% 30%, rgba(255,255,255,0.08) 0%, transparent 60%)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />

          {/* Logo "A" with neon effect */}
          <span 
            className="relative text-5xl md:text-6xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #e9d5ff 0%, #a855f7 40%, #06b6d4 80%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 24px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 48px rgba(6, 182, 212, 0.3))',
            }}
          >
            A
          </span>
        </div>

        {/* Brand name with stagger */}
        <h1 
          className="mt-6 md:mt-8 text-2xl md:text-3xl font-semibold tracking-[0.15em]"
          style={{
            background: 'linear-gradient(135deg, #f0f0f0 0%, #c084fc 50%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 400ms ease-out, transform 400ms ease-out',
          }}
        >
          AuraDesk
        </h1>

        {/* Tagline */}
        <p
          className="mt-2 text-xs md:text-sm tracking-[0.25em] uppercase"
          style={{ 
            color: colors.text,
            opacity: phase >= 2 ? 1 : 0,
            transition: 'opacity 300ms ease-out 150ms',
          }}
        >
          Your Unified Workspace
        </p>

        {/* Aura loading bar */}
        <div
          className="mt-8 w-32 md:w-40 h-[2px] rounded-full overflow-hidden"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            opacity: phase >= 3 ? 1 : 0,
            transition: 'opacity 200ms ease-out',
          }}
        >
          <div
            className="h-full rounded-full animate-splash-loading"
            style={{
              background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #a855f7)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(6,182,212,0.4), rgba(236,72,153,0.3), transparent)',
          transform: phase >= 1 ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 1000ms ease-out 200ms',
        }}
      />

      <style>{`
        @keyframes splash-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          33% { transform: translate(30px, -20px) scale(1.1); opacity: 0.7; }
          66% { transform: translate(-15px, 15px) scale(0.95); opacity: 0.4; }
        }
        @keyframes splash-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          33% { transform: translate(-25px, 15px) scale(1.05); opacity: 0.6; }
          66% { transform: translate(20px, -10px) scale(0.9); opacity: 0.35; }
        }
        @keyframes splash-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(-10px, 20px) scale(1.15); opacity: 0.5; }
        }
        .animate-splash-orb-1 { animation: splash-orb-1 6s ease-in-out infinite; }
        .animate-splash-orb-2 { animation: splash-orb-2 7s ease-in-out infinite; }
        .animate-splash-orb-3 { animation: splash-orb-3 5s ease-in-out infinite; }

        @keyframes splash-ring-outer {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes splash-ring-inner {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-splash-ring-outer { animation: splash-ring-outer 10s linear infinite; }
        .animate-splash-ring-inner { animation: splash-ring-inner 7s linear infinite; }

        @keyframes splash-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
        .animate-splash-pulse { animation: splash-pulse 2.5s ease-in-out infinite; }

        @keyframes splash-loading {
          0% { width: 0%; background-position: 0% 0%; }
          50% { width: 70%; background-position: 100% 0%; }
          100% { width: 100%; background-position: 0% 0%; }
        }
        .animate-splash-loading { animation: splash-loading 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
