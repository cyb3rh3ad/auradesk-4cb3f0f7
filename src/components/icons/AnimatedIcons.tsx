import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedIconProps {
  className?: string;
  isActive?: boolean;
  isHovered?: boolean;
}

// Spring config for consistent, smooth animations
const springConfig = { type: "spring", stiffness: 400, damping: 20 } as const;

// Home icon - simple scale + slight rotate
export const AnimatedHomeIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ 
      scale: isHovered ? 1.15 : 1,
      rotate: isHovered ? -5 : 0
    }}
    transition={springConfig}
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </motion.svg>
);

// Chat icon - bounce with dots appearing
export const AnimatedChatIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
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
);

// Teams icon - pulse effect
export const AnimatedTeamsIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
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
);

// Video icon - simple scale with recording dot
export const AnimatedVideoIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
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
);

// Files icon - folder that opens on hover
export const AnimatedFilesIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ scale: isHovered ? 1.12 : 1 }}
    transition={springConfig}
  >
    {/* Folder back */}
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    {/* Folder lid that opens */}
    <motion.path 
      d="M2 10h20"
      animate={{ 
        d: isHovered ? "M2 8h20" : "M2 10h20",
        opacity: isHovered ? 0.5 : 1
      }}
      transition={springConfig}
    />
    {/* Document peeking out on hover */}
    {isHovered && (
      <motion.g
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <rect x="8" y="11" width="8" height="6" rx="1" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth="1.5" />
      </motion.g>
    )}
  </motion.svg>
);

// AI Sparkles icon - rotating sparkle (larger size for better visibility)
export const AnimatedAIIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-7 h-7", className)}
    animate={{ 
      scale: isHovered ? 1.15 : 1,
      rotate: isHovered ? 15 : 0
    }}
    transition={springConfig}
  >
    <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="currentColor" fillOpacity={0.2} />
    <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" />
    {isHovered && (
      <>
        <motion.path d="M19 8l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.05 }} />
        <motion.path d="M5 16l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} />
      </>
    )}
  </motion.svg>
);

// Crown icon - floats up with shimmer
export const AnimatedCrownIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
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
);

// Shield icon - check appears on hover
export const AnimatedShieldIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ scale: isHovered ? 1.12 : 1 }}
    transition={springConfig}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity={isHovered ? 0.2 : 0.1} />
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    {isHovered && (
      <motion.path d="M9 12l2 2 4-4" strokeWidth="2.5" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.25 }} />
    )}
  </motion.svg>
);

// Settings icon - smooth rotation
export const AnimatedSettingsIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ rotate: isHovered ? 45 : 0, scale: isHovered ? 1.1 : 1 }}
    transition={springConfig}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </motion.svg>
);

// Headphones icon - simple pulse
export const AnimatedHeadphonesIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ scale: isHovered ? 1.1 : 1, y: isHovered ? -1 : 0 }}
    transition={springConfig}
  >
    <path d="M3 18v-6a9 9 0 0118 0v6" />
    <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
  </motion.svg>
);

// Bell icon - gentle shake
export const AnimatedBellIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ 
      scale: isHovered ? 1.1 : 1,
      rotate: isHovered ? [0, 8, -8, 4, 0] : 0 
    }}
    transition={{ duration: 0.4 }}
  >
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </motion.svg>
);

// Search icon - simple zoom
export const AnimatedSearchIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ scale: isHovered ? 1.15 : 1 }}
    transition={springConfig}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </motion.svg>
);

// Logout icon - arrow slides out
export const AnimatedLogoutIcon = ({ className, isHovered = false }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-6 h-6", className)}
    animate={{ scale: isHovered ? 1.1 : 1, x: isHovered ? 2 : 0 }}
    transition={springConfig}
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </motion.svg>
);
