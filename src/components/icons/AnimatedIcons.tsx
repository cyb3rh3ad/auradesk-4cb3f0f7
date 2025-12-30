import { motion, Transition } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedIconProps {
  className?: string;
  isActive?: boolean;
}

// Reliable spring animation configs with proper typing
const spring: Transition = { type: "spring", stiffness: 400, damping: 25 };
const gentleSpring: Transition = { type: "spring", stiffness: 300, damping: 20 };

// Home icon with door that opens
export const AnimatedHomeIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover={{ scale: 1.1 }}
    transition={spring}
  >
    {/* House outline */}
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    {/* Door */}
    <motion.rect
      x="9"
      y="13"
      width="6"
      height="9"
      initial={{ scaleX: 1 }}
      whileHover={{ scaleX: 0.7, x: -1 }}
      transition={gentleSpring}
      style={{ originX: 0, transformBox: "fill-box" }}
    />
  </motion.svg>
);

// Chat icon with thinking dots
export const AnimatedChatIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Chat bubble */}
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    {/* Thinking dots that appear on hover */}
    <motion.g>
      <motion.circle
        cx="8"
        cy="10"
        r="1.2"
        fill="currentColor"
        stroke="none"
        variants={{
          initial: { opacity: 0, y: 2 },
          hover: { opacity: 1, y: 0 }
        }}
        transition={{ ...gentleSpring }}
      />
      <motion.circle
        cx="12"
        cy="10"
        r="1.2"
        fill="currentColor"
        stroke="none"
        variants={{
          initial: { opacity: 0, y: 2 },
          hover: { opacity: 1, y: 0 }
        }}
        transition={{ ...gentleSpring, delay: 0.08 }}
      />
      <motion.circle
        cx="16"
        cy="10"
        r="1.2"
        fill="currentColor"
        stroke="none"
        variants={{
          initial: { opacity: 0, y: 2 },
          hover: { opacity: 1, y: 0 }
        }}
        transition={{ ...gentleSpring, delay: 0.16 }}
      />
    </motion.g>
  </motion.svg>
);

// Teams icon with members gathering
export const AnimatedTeamsIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Center person */}
    <circle cx="12" cy="7" r="3" />
    <path d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" />
    {/* Left person slides in */}
    <motion.g
      variants={{
        initial: { x: -3, opacity: 0.4 },
        hover: { x: 0, opacity: 1 }
      }}
      transition={gentleSpring}
    >
      <circle cx="5" cy="9" r="2" />
      <path d="M5 14c-2 0-3 1-3 2v1h3" />
    </motion.g>
    {/* Right person slides in */}
    <motion.g
      variants={{
        initial: { x: 3, opacity: 0.4 },
        hover: { x: 0, opacity: 1 }
      }}
      transition={gentleSpring}
    >
      <circle cx="19" cy="9" r="2" />
      <path d="M19 14c2 0 3 1 3 2v1h-3" />
    </motion.g>
  </motion.svg>
);

// Video/Meetings icon with recording light
export const AnimatedVideoIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Camera body */}
    <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
    {/* Lens/viewfinder */}
    <polygon points="23 7 16 12 23 17 23 7" />
    {/* Recording light that pulses */}
    <motion.circle
      cx="6"
      cy="10"
      r="1.5"
      stroke="none"
      variants={{
        initial: { fill: "currentColor", opacity: 0.3 },
        hover: { 
          fill: "#ef4444",
          opacity: [0.4, 1, 0.4],
          transition: {
            opacity: { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
          }
        }
      }}
    />
  </motion.svg>
);

// Folder icon that opens with file inside
export const AnimatedFilesIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Folder back */}
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    {/* Folder front flap that moves */}
    <motion.path
      d="M2 8h20"
      stroke="currentColor"
      variants={{
        initial: { y: 0 },
        hover: { y: -2 }
      }}
      transition={gentleSpring}
    />
    {/* File peeking out */}
    <motion.g
      variants={{
        initial: { y: 0, opacity: 0 },
        hover: { y: -5, opacity: 1 }
      }}
      transition={{ ...gentleSpring, delay: 0.05 }}
    >
      <rect x="8" y="12" width="8" height="6" rx="1" fill="currentColor" opacity="0.3" />
      <line x1="10" y1="14" x2="14" y2="14" strokeWidth="1" />
      <line x1="10" y1="16" x2="12" y2="16" strokeWidth="1" />
    </motion.g>
  </motion.svg>
);

// AI Sparkles icon with glow effect
export const AnimatedAIIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Main sparkle */}
    <motion.path
      d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"
      fill="currentColor"
      fillOpacity={0.2}
      variants={{
        initial: { scale: 1, rotate: 0 },
        hover: { scale: 1.15, rotate: 12 }
      }}
      transition={spring}
    />
    {/* Secondary sparkle - top right */}
    <motion.path
      d="M19 8l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"
      fill="currentColor"
      variants={{
        initial: { scale: 0.8, opacity: 0.4 },
        hover: { scale: 1.2, opacity: 1 }
      }}
      transition={{ ...spring, delay: 0.05 }}
    />
    {/* Secondary sparkle - bottom left */}
    <motion.path
      d="M5 16l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"
      fill="currentColor"
      variants={{
        initial: { scale: 0.8, opacity: 0.4 },
        hover: { scale: 1.2, opacity: 1 }
      }}
      transition={{ ...spring, delay: 0.1 }}
    />
  </motion.svg>
);

// Crown/Subscription icon with shine effect
export const AnimatedCrownIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Crown base */}
    <motion.path
      d="M2 17l3-10 5 6 2-8 2 8 5-6 3 10z"
      fill="currentColor"
      fillOpacity={0.2}
      variants={{
        initial: { y: 0 },
        hover: { y: -3 }
      }}
      transition={gentleSpring}
    />
    {/* Crown band */}
    <path d="M2 17h20v2H2z" fill="currentColor" fillOpacity={0.3} />
    {/* Shine rays */}
    <motion.g
      variants={{
        initial: { opacity: 0 },
        hover: { opacity: 1 }
      }}
      transition={{ duration: 0.2 }}
    >
      <line x1="7" y1="5" x2="9" y2="3" strokeWidth="1.5" />
      <line x1="17" y1="5" x2="15" y2="3" strokeWidth="1.5" />
      <line x1="12" y1="4" x2="12" y2="1" strokeWidth="1.5" />
    </motion.g>
  </motion.svg>
);

// Shield/Admin icon with pulse effect
export const AnimatedShieldIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Shield outline */}
    <motion.path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill="currentColor"
      fillOpacity={0.1}
      variants={{
        initial: { scale: 1 },
        hover: { scale: 1.08, fillOpacity: 0.2 }
      }}
      transition={spring}
    />
    {/* Checkmark that draws */}
    <motion.path
      d="M9 12l2 2 4-4"
      strokeWidth="2.5"
      variants={{
        initial: { pathLength: 0, opacity: 0 },
        hover: { pathLength: 1, opacity: 1 }
      }}
      transition={{ duration: 0.3, delay: 0.1 }}
    />
  </motion.svg>
);

// Settings icon with rotation
export const AnimatedSettingsIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover={{ rotate: 90 }}
    transition={{ type: "spring", stiffness: 200, damping: 15 }}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </motion.svg>
);

// Headphones/Support icon with sound waves
export const AnimatedHeadphonesIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    {/* Headphone band */}
    <path d="M3 18v-6a9 9 0 0118 0v6" />
    {/* Left ear cup with pulse */}
    <motion.path
      d="M3 18a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2z"
      variants={{
        initial: { scale: 1 },
        hover: { scale: [1, 1.05, 1, 1.05, 1] }
      }}
      transition={{ duration: 0.6 }}
    />
    {/* Right ear cup with pulse */}
    <motion.path
      d="M21 18a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h1a2 2 0 012 2z"
      variants={{
        initial: { scale: 1 },
        hover: { scale: [1, 1.05, 1, 1.05, 1] }
      }}
      transition={{ duration: 0.6, delay: 0.1 }}
    />
  </motion.svg>
);

// Bell/Notification icon with ring animation
export const AnimatedBellIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    style={{ originX: 0.5, originY: 0 }}
    whileHover={{ 
      rotate: [0, 12, -12, 8, -8, 4, 0],
    }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </motion.svg>
);

// Search icon with magnify effect
export const AnimatedSearchIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover={{ scale: 1.1 }}
    transition={spring}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </motion.svg>
);

// Logout icon with door exit animation
export const AnimatedLogoutIcon = ({ className }: AnimatedIconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-5 h-5", className)}
    whileHover="hover"
    initial="initial"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <motion.g
      variants={{
        initial: { x: 0 },
        hover: { x: 4 }
      }}
      transition={spring}
    >
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </motion.g>
  </motion.svg>
);
