import { useState, useCallback } from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedIconProps {
  className?: string;
  isActive?: boolean;
}

// Reliable wrapper with proper event handling
const IconWrapper = ({ 
  children, 
  className 
}: { 
  children: (isHovered: boolean) => React.ReactNode; 
  className?: string 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleEnter = useCallback(() => setIsHovered(true), []);
  const handleLeave = useCallback(() => setIsHovered(false), []);
  
  return (
    <div 
      className={cn("inline-flex items-center justify-center cursor-pointer select-none", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      {children(isHovered)}
    </div>
  );
};

// Spring config for consistent, smooth animations
const springConfig = { type: "spring", stiffness: 500, damping: 25 } as const;

// Home icon - simple scale + slight rotate
export const AnimatedHomeIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ 
          scale: isHovered ? 1.15 : 1,
          rotate: isHovered ? -5 : 0
        }}
        transition={springConfig}
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Chat icon - bounce with dots appearing
export const AnimatedChatIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ scale: isHovered ? 1.12 : 1, y: isHovered ? -1 : 0 }}
        transition={springConfig}
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        {isHovered && (
          <>
            <motion.circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }} />
            <motion.circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }} />
            <motion.circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.16 }} />
          </>
        )}
      </motion.svg>
    )}
  </IconWrapper>
);

// Teams icon - pulse effect
export const AnimatedTeamsIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ scale: isHovered ? 1.12 : 1 }}
        transition={springConfig}
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <motion.path 
          d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          animate={{ opacity: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.2 }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Video icon - simple scale with recording dot
export const AnimatedVideoIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ scale: isHovered ? 1.12 : 1 }}
        transition={springConfig}
      >
        <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
        <polygon points="23 7 16 12 23 17 23 7" />
        {isHovered && (
          <motion.circle
            cx="6" cy="10" r="2"
            fill="#ef4444"
            stroke="none"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </motion.svg>
    )}
  </IconWrapper>
);

// Files icon - floating document with sparkle effect
export const AnimatedFilesIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ 
          scale: isHovered ? 1.12 : 1,
          y: isHovered ? -2 : 0
        }}
        transition={springConfig}
      >
        {/* Main document */}
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
        {/* Sparkle particles on hover */}
        {isHovered && (
          <>
            <motion.circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [0, -3, -6] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.3 }} />
            <motion.circle cx="21" cy="4" r="0.8" fill="currentColor" stroke="none" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [0, -2, -4] }} transition={{ duration: 0.5, delay: 0.2, repeat: Infinity, repeatDelay: 0.4 }} />
            <motion.circle cx="19" cy="14" r="0.6" fill="currentColor" stroke="none" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }} transition={{ duration: 0.4, delay: 0.1, repeat: Infinity, repeatDelay: 0.5 }} />
          </>
        )}
      </motion.svg>
    )}
  </IconWrapper>
);

// AI Sparkles icon - rotating sparkle
export const AnimatedAIIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ 
          scale: isHovered ? 1.15 : 1,
          rotate: isHovered ? 15 : 0
        }}
        transition={springConfig}
      >
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill="currentColor" fillOpacity={0.2} />
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        {isHovered && (
          <>
            <motion.path d="M19 8l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.05 }} />
            <motion.path d="M5 16l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} />
          </>
        )}
      </motion.svg>
    )}
  </IconWrapper>
);

// Crown icon - floats up with shimmer
export const AnimatedCrownIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ 
          scale: isHovered ? 1.15 : 1, 
          y: isHovered ? -2 : 0 
        }}
        transition={springConfig}
      >
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="currentColor" fillOpacity={isHovered ? 0.25 : 0.1} />
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
        <line x1="3" y1="20" x2="21" y2="20" />
        {isHovered && (
          <>
            <motion.circle cx="4" cy="2" r="1" fill="currentColor" stroke="none" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} />
            <motion.circle cx="20" cy="2" r="1" fill="currentColor" stroke="none" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5, delay: 0.25, repeat: Infinity }} />
          </>
        )}
      </motion.svg>
    )}
  </IconWrapper>
);

// Shield icon - check appears on hover
export const AnimatedShieldIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ scale: isHovered ? 1.12 : 1 }}
        transition={springConfig}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity={isHovered ? 0.2 : 0.1} />
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        {isHovered && (
          <motion.path d="M9 12l2 2 4-4" strokeWidth="2.5" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.25 }} />
        )}
      </motion.svg>
    )}
  </IconWrapper>
);

// Settings icon - smooth rotation
export const AnimatedSettingsIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ rotate: isHovered ? 45 : 0, scale: isHovered ? 1.1 : 1 }}
        transition={springConfig}
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Headphones icon - simple pulse
export const AnimatedHeadphonesIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ scale: isHovered ? 1.1 : 1, y: isHovered ? -1 : 0 }}
        transition={springConfig}
      >
        <path d="M3 18v-6a9 9 0 0118 0v6" />
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Bell icon - gentle shake
export const AnimatedBellIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ 
          scale: isHovered ? 1.1 : 1,
          rotate: isHovered ? [0, 8, -8, 4, 0] : 0 
        }}
        transition={{ duration: 0.4 }}
      >
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Search icon - simple zoom
export const AnimatedSearchIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ scale: isHovered ? 1.15 : 1 }}
        transition={springConfig}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Logout icon - arrow slides out
export const AnimatedLogoutIcon = ({ className }: AnimatedIconProps) => (
  <IconWrapper className={className}>
    {(isHovered) => (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        animate={{ scale: isHovered ? 1.1 : 1, x: isHovered ? 2 : 0 }}
        transition={springConfig}
      >
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </motion.svg>
    )}
  </IconWrapper>
);
