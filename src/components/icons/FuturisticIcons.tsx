import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  isActive?: boolean;
  isHovered?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-7 h-7",
};

// Unified spring config for consistent feel
const spring = { type: "spring", stiffness: 500, damping: 25 } as const;

// Home - Futuristic hexagon house
export const FuturisticHomeIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ 
      scale: isHovered ? 1.1 : 1,
      filter: isActive ? "drop-shadow(0 0 6px currentColor)" : "none"
    }}
    transition={spring}
  >
    {/* Hexagonal base with glow */}
    <motion.path
      d="M12 2L3 7v10l9 5 9-5V7l-9-5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.15 : 0}
    />
    {/* Inner doorway */}
    <motion.path
      d="M9 22V14h6v8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ opacity: isHovered || isActive ? 1 : 0.7 }}
    />
    {/* Center accent */}
    <motion.circle
      cx="12"
      cy="10"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity={isActive || isHovered ? 0.3 : 0.1}
    />
  </motion.svg>
);

// Chat - Sleek message bubble with digital effect
export const FuturisticChatIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ 
      scale: isHovered ? 1.1 : 1,
      y: isHovered ? -1 : 0 
    }}
    transition={spring}
  >
    {/* Main bubble - rounded rectangle style */}
    <motion.path
      d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H8l-4 4V6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.15 : 0}
    />
    {/* Digital typing indicators */}
    <motion.g animate={{ opacity: isHovered ? 1 : 0.6 }}>
      <motion.rect x="7" y="9" width="2" height="2" rx="0.5" fill="currentColor" 
        animate={isHovered ? { scaleY: [1, 1.5, 1] } : {}}
        transition={{ duration: 0.4, repeat: isHovered ? Infinity : 0, repeatDelay: 0.1 }}
      />
      <motion.rect x="11" y="9" width="2" height="2" rx="0.5" fill="currentColor"
        animate={isHovered ? { scaleY: [1, 1.5, 1] } : {}}
        transition={{ duration: 0.4, delay: 0.1, repeat: isHovered ? Infinity : 0, repeatDelay: 0.1 }}
      />
      <motion.rect x="15" y="9" width="2" height="2" rx="0.5" fill="currentColor"
        animate={isHovered ? { scaleY: [1, 1.5, 1] } : {}}
        transition={{ duration: 0.4, delay: 0.2, repeat: isHovered ? Infinity : 0, repeatDelay: 0.1 }}
      />
    </motion.g>
  </motion.svg>
);

// Teams - Connected nodes network
export const FuturisticTeamsIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ scale: isHovered ? 1.1 : 1 }}
    transition={spring}
  >
    {/* Central node */}
    <motion.circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.2 : 0}
    />
    {/* Orbital nodes */}
    <motion.circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity={0.15} />
    <motion.circle cx="19" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity={0.15} />
    <motion.circle cx="5" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity={0.15} />
    {/* Connection lines */}
    <motion.g 
      stroke="currentColor" 
      strokeWidth="1"
      animate={{ opacity: isHovered ? 1 : 0.4 }}
    >
      <line x1="12" y1="6" x2="12" y2="9" />
      <line x1="14.5" y1="14" x2="17.5" y2="15" />
      <line x1="9.5" y1="14" x2="6.5" y2="15" />
    </motion.g>
    {/* Pulse effect on hover */}
    {isHovered && (
      <motion.circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        initial={{ r: 3, opacity: 0.8 }}
        animate={{ r: 6, opacity: 0 }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    )}
  </motion.svg>
);

// Video - Modern camera with lens flare
export const FuturisticVideoIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ scale: isHovered ? 1.1 : 1 }}
    transition={spring}
  >
    {/* Camera body */}
    <motion.rect
      x="2"
      y="6"
      width="14"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.15 : 0}
    />
    {/* Lens */}
    <motion.circle
      cx="9"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity={isHovered || isActive ? 0.2 : 0.1}
    />
    {/* Play/broadcast arrow */}
    <motion.path
      d="M17 9l5-2v10l-5-2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity={0.1}
    />
    {/* Recording indicator */}
    {(isHovered || isActive) && (
      <motion.circle
        cx="5"
        cy="9"
        r="1.5"
        fill="#ef4444"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    )}
  </motion.svg>
);

// Files - Layered documents with data lines
export const FuturisticFilesIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ 
      scale: isHovered ? 1.1 : 1,
      y: isHovered ? -1 : 0
    }}
    transition={spring}
  >
    {/* Back layer */}
    <motion.rect
      x="6"
      y="4"
      width="14"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity={0.05}
      animate={{ x: isHovered ? 7 : 6 }}
      transition={spring}
    />
    {/* Front layer */}
    <motion.rect
      x="4"
      y="6"
      width="14"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.15 : 0}
      animate={{ x: isHovered ? 3 : 4 }}
      transition={spring}
    />
    {/* Data lines */}
    <motion.g stroke="currentColor" strokeWidth="1" strokeLinecap="round" animate={{ opacity: isHovered ? 1 : 0.5 }}>
      <line x1="7" y1="11" x2="15" y2="11" />
      <line x1="7" y1="14" x2="13" y2="14" />
      <line x1="7" y1="17" x2="11" y2="17" />
    </motion.g>
  </motion.svg>
);

// AI - Neural spark pattern
export const FuturisticAIIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size === "md" ? "lg" : size], className)}
    animate={{ 
      scale: isHovered ? 1.12 : 1,
      rotate: isHovered ? 15 : 0
    }}
    transition={spring}
  >
    {/* Central star/spark */}
    <motion.path
      d="M12 2v4m0 12v4m-10-10h4m12 0h4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <motion.path
      d="M5.64 5.64l2.83 2.83m7.06 7.06l2.83 2.83m0-12.72l-2.83 2.83m-7.06 7.06l-2.83 2.83"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      animate={{ opacity: isHovered ? 1 : 0.6 }}
    />
    {/* Core */}
    <motion.circle
      cx="12"
      cy="12"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.2 : 0}
    />
    {/* Inner core */}
    <motion.circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      fillOpacity={isHovered || isActive ? 0.4 : 0.2}
    />
    {/* Orbiting particles on hover */}
    {isHovered && (
      <>
        <motion.circle
          cx="12"
          cy="12"
          r="1"
          fill="currentColor"
          initial={{ x: 0, y: -6 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "12px 12px" }}
        />
      </>
    )}
  </motion.svg>
);

// Crown - Premium crystalline crown
export const FuturisticCrownIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ 
      scale: isHovered ? 1.12 : 1,
      y: isHovered ? -2 : 0
    }}
    transition={spring}
  >
    {/* Crown shape */}
    <motion.path
      d="M3 6l3 10h12l3-10-5 4-4-6-4 6-5-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.2 : 0}
    />
    {/* Base */}
    <motion.line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Gems */}
    <motion.circle cx="8" cy="11" r="1" fill="currentColor" fillOpacity={isHovered ? 0.8 : 0.4} />
    <motion.circle cx="12" cy="8" r="1.5" fill="currentColor" fillOpacity={isHovered ? 0.8 : 0.4} />
    <motion.circle cx="16" cy="11" r="1" fill="currentColor" fillOpacity={isHovered ? 0.8 : 0.4} />
    {/* Shimmer effect */}
    {isHovered && (
      <motion.path
        d="M6 4l1 2M18 4l-1 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: [0, 1, 0], y: [2, 0, -2] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    )}
  </motion.svg>
);

// Shield - Modern security badge
export const FuturisticShieldIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ scale: isHovered ? 1.1 : 1 }}
    transition={spring}
  >
    {/* Shield outline */}
    <motion.path
      d="M12 3L4 7v6c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5V7l-8-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.15 : 0}
    />
    {/* Inner accent line */}
    <motion.path
      d="M12 6l-5 2.5v4c0 3.5 2.5 6.5 5 7.5 2.5-1 5-4 5-7.5v-4L12 6z"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
      opacity={0.4}
    />
    {/* Checkmark */}
    <motion.path
      d="M9 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ 
        pathLength: isHovered ? 1 : 0.8,
        opacity: isHovered ? 1 : 0.6
      }}
      transition={{ duration: 0.3 }}
    />
  </motion.svg>
);

// Settings - Mechanical gear with tech elements
export const FuturisticSettingsIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ 
      rotate: isHovered ? 90 : 0,
      scale: isHovered ? 1.1 : 1
    }}
    transition={spring}
  >
    {/* Outer gear */}
    <motion.path
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Center circle */}
    <motion.circle
      cx="12"
      cy="12"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={isActive ? "currentColor" : "none"}
      fillOpacity={isActive ? 0.15 : 0}
    />
    {/* Inner dot */}
    <motion.circle
      cx="12"
      cy="12"
      r="1.5"
      fill="currentColor"
      fillOpacity={isHovered || isActive ? 0.5 : 0.3}
    />
  </motion.svg>
);

// More - Expandable dots
export const FuturisticMoreIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <motion.svg
    viewBox="0 0 24 24"
    fill="none"
    className={cn(sizeMap[size], className)}
    animate={{ scale: isHovered ? 1.1 : 1 }}
    transition={spring}
  >
    <motion.circle
      cx="6"
      cy="12"
      r="2"
      fill="currentColor"
      animate={{ x: isHovered ? -1 : 0 }}
      transition={spring}
    />
    <motion.circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      animate={{ scale: isHovered ? 1.2 : 1 }}
      transition={spring}
    />
    <motion.circle
      cx="18"
      cy="12"
      r="2"
      fill="currentColor"
      animate={{ x: isHovered ? 1 : 0 }}
      transition={spring}
    />
  </motion.svg>
);

export {
  FuturisticHomeIcon as HomeIcon,
  FuturisticChatIcon as ChatIcon,
  FuturisticTeamsIcon as TeamsIcon,
  FuturisticVideoIcon as VideoIcon,
  FuturisticFilesIcon as FilesIcon,
  FuturisticAIIcon as AIIcon,
  FuturisticCrownIcon as CrownIcon,
  FuturisticShieldIcon as ShieldIcon,
  FuturisticSettingsIcon as SettingsIcon,
  FuturisticMoreIcon as MoreIcon,
};
