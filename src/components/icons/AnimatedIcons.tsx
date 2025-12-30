import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedIconProps {
  className?: string;
  isActive?: boolean;
}

// Wrapper component for reliable hover detection
const IconWrapper = ({ children, className }: { children: (isHovered: boolean) => React.ReactNode; className?: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={cn("inline-flex items-center justify-center", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children(isHovered)}
    </div>
  );
};

// Home icon with door that opens
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
        animate={{ scale: isHovered ? 1.15 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <motion.rect
          x="9"
          y="13"
          width="6"
          height="9"
          animate={{ scaleX: isHovered ? 0.6 : 1, x: isHovered ? -1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ originX: 0, transformBox: "fill-box" }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Chat icon with thinking dots
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
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <motion.circle
          cx="8" cy="10" r="1.2"
          fill="currentColor" stroke="none"
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 3 }}
          transition={{ duration: 0.15, delay: 0 }}
        />
        <motion.circle
          cx="12" cy="10" r="1.2"
          fill="currentColor" stroke="none"
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 3 }}
          transition={{ duration: 0.15, delay: 0.08 }}
        />
        <motion.circle
          cx="16" cy="10" r="1.2"
          fill="currentColor" stroke="none"
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 3 }}
          transition={{ duration: 0.15, delay: 0.16 }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Teams icon with members gathering
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
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <circle cx="12" cy="7" r="3" />
        <path d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" />
        <motion.g
          animate={{ x: isHovered ? 0 : -3, opacity: isHovered ? 1 : 0.4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <circle cx="5" cy="9" r="2" />
          <path d="M5 14c-2 0-3 1-3 2v1h3" />
        </motion.g>
        <motion.g
          animate={{ x: isHovered ? 0 : 3, opacity: isHovered ? 1 : 0.4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <circle cx="19" cy="9" r="2" />
          <path d="M19 14c2 0 3 1 3 2v1h-3" />
        </motion.g>
      </motion.svg>
    )}
  </IconWrapper>
);

// Video/Meetings icon with recording light
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
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
        <polygon points="23 7 16 12 23 17 23 7" />
        <motion.circle
          cx="6" cy="10" r="1.5"
          stroke="none"
          animate={{ 
            fill: isHovered ? "#ef4444" : "currentColor", 
            opacity: isHovered ? [0.4, 1, 0.4] : 0.3
          }}
          transition={{ 
            duration: isHovered ? 0.6 : 0.2,
            repeat: isHovered ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Folder icon that opens with file inside
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
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        <motion.path
          d="M2 8h20"
          stroke="currentColor"
          animate={{ y: isHovered ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
        <motion.g
          animate={{ y: isHovered ? -5 : 0, opacity: isHovered ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
        >
          <rect x="8" y="12" width="8" height="6" rx="1" fill="currentColor" opacity="0.3" />
          <line x1="10" y1="14" x2="14" y2="14" strokeWidth="1" />
          <line x1="10" y1="16" x2="12" y2="16" strokeWidth="1" />
        </motion.g>
      </motion.svg>
    )}
  </IconWrapper>
);

// AI Sparkles icon with glow effect
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
        animate={{ scale: isHovered ? 1.15 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <motion.path
          d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"
          fill="currentColor"
          fillOpacity={0.2}
          animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 12 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        />
        <motion.path
          d="M19 8l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"
          fill="currentColor"
          animate={{ scale: isHovered ? 1.3 : 0.8, opacity: isHovered ? 1 : 0.4 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
        />
        <motion.path
          d="M5 16l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"
          fill="currentColor"
          animate={{ scale: isHovered ? 1.3 : 0.8, opacity: isHovered ? 1 : 0.4 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Diamond/Gem icon for Subscription - premium feel
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
        animate={{ scale: isHovered ? 1.15 : 1, y: isHovered ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {/* Diamond shape */}
        <motion.path
          d="M6 3h12l4 6-10 12L2 9l4-6z"
          fill="currentColor"
          animate={{ 
            fillOpacity: isHovered ? 0.3 : 0.1,
          }}
          transition={{ duration: 0.2 }}
        />
        {/* Top facets */}
        <path d="M6 3l6 6 6-6" />
        <path d="M2 9h20" />
        <path d="M12 9l-10 0 10 12 10-12" />
        {/* Shine effect */}
        <motion.line
          x1="9" y1="6" x2="8" y2="4"
          strokeWidth="1.5"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.15, delay: 0.1 }}
        />
        <motion.line
          x1="15" y1="6" x2="16" y2="4"
          strokeWidth="1.5"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.15, delay: 0.15 }}
        />
        <motion.circle
          cx="12" cy="2"
          r="1"
          fill="currentColor"
          stroke="none"
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0 }}
          transition={{ duration: 0.15, delay: 0.2 }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Shield/Admin icon with pulse effect
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
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <motion.path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          fill="currentColor"
          animate={{ fillOpacity: isHovered ? 0.25 : 0.1 }}
          transition={{ duration: 0.2 }}
        />
        <motion.path
          d="M9 12l2 2 4-4"
          strokeWidth="2.5"
          animate={{ 
            pathLength: isHovered ? 1 : 0, 
            opacity: isHovered ? 1 : 0 
          }}
          transition={{ duration: 0.25, delay: 0.1 }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Settings icon with rotation
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
        animate={{ rotate: isHovered ? 90 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Headphones/Support icon with sound waves
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
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <path d="M3 18v-6a9 9 0 0118 0v6" />
        <motion.path
          d="M3 18a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2z"
          animate={{ scale: isHovered ? [1, 1.08, 1] : 1 }}
          transition={{ duration: 0.4, repeat: isHovered ? Infinity : 0, repeatDelay: 0.2 }}
        />
        <motion.path
          d="M21 18a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h1a2 2 0 012 2z"
          animate={{ scale: isHovered ? [1, 1.08, 1] : 1 }}
          transition={{ duration: 0.4, delay: 0.1, repeat: isHovered ? Infinity : 0, repeatDelay: 0.2 }}
        />
      </motion.svg>
    )}
  </IconWrapper>
);

// Bell/Notification icon with ring animation
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
        style={{ originX: 0.5, originY: 0.15 }}
        animate={{ rotate: isHovered ? [0, 12, -12, 8, -8, 4, 0] : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Search icon with magnify effect
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
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </motion.svg>
    )}
  </IconWrapper>
);

// Logout icon with door exit animation
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
        animate={{ scale: isHovered ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <motion.g
          animate={{ x: isHovered ? 4 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </motion.g>
      </motion.svg>
    )}
  </IconWrapper>
);
