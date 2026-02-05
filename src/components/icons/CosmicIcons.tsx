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

// Spring config matching AuraDesk logo feel
const cosmicSpring = { type: "spring", stiffness: 400, damping: 22 } as const;

// Generate unique ID for gradients
const useUniqueId = () => `cosmic-${Math.random().toString(36).substr(2, 9)}`;

// Cosmic Home - Hexagonal portal with nebula glow
export const CosmicHomeIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ 
        scale: isHovered ? 1.15 : 1,
        filter: isActive || isHovered ? "drop-shadow(0 0 8px hsl(var(--primary)))" : "none"
      }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(280, 80%, 70%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(180, 80%, 60%)" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      
      {/* Ambient glow on hover */}
      {(isHovered || isActive) && (
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          fill={`url(#${id}-glow)`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Hexagonal house base */}
      <motion.path
        d="M12 2L3 7v10l9 5 9-5V7l-9-5z"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={isActive ? "currentColor" : "none"}
        fillOpacity={isActive ? 0.15 : 0}
      />
      
      {/* Inner doorway with glow */}
      <motion.path
        d="M9 22V14h6v8"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: isHovered || isActive ? 1 : 0.7 }}
      />
      
      {/* Central orb */}
      <motion.circle
        cx="12"
        cy="10"
        r="2"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity={isActive || isHovered ? 0.4 : 0.15}
        animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.6, repeat: isHovered ? Infinity : 0 }}
      />
    </motion.svg>
  );
};

// Cosmic Chat - Ethereal message bubble with aurora particles
export const CosmicChatIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ 
        scale: isHovered ? 1.12 : 1,
        y: isHovered ? -2 : 0 
      }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(180, 80%, 60%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(280, 70%, 65%)" />
        </linearGradient>
      </defs>
      
      {/* Main bubble with cosmic gradient */}
      <motion.path
        d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H8l-4 4V6z"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={isActive ? "currentColor" : "none"}
        fillOpacity={isActive ? 0.12 : 0}
        style={{ filter: isHovered ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" : "none" }}
      />
      
      {/* Floating orb particles */}
      <motion.g animate={{ opacity: isHovered ? 1 : 0.5 }}>
        <motion.circle 
          cx="8" cy="10" r="1.2" 
          fill={isHovered ? "hsl(180, 80%, 60%)" : "currentColor"}
          animate={isHovered ? { 
            y: [0, -1, 0],
            opacity: [0.6, 1, 0.6]
          } : {}}
          transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0, delay: 0 }}
        />
        <motion.circle 
          cx="12" cy="10" r="1.2" 
          fill={isHovered ? "hsl(var(--primary))" : "currentColor"}
          animate={isHovered ? { 
            y: [0, -1.5, 0],
            opacity: [0.6, 1, 0.6]
          } : {}}
          transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0, delay: 0.15 }}
        />
        <motion.circle 
          cx="16" cy="10" r="1.2" 
          fill={isHovered ? "hsl(280, 70%, 65%)" : "currentColor"}
          animate={isHovered ? { 
            y: [0, -1, 0],
            opacity: [0.6, 1, 0.6]
          } : {}}
          transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0, delay: 0.3 }}
        />
      </motion.g>
    </motion.svg>
  );
};

// Cosmic Teams - Orbital constellation network
export const CosmicTeamsIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ scale: isHovered ? 1.12 : 1 }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(280, 80%, 70%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(180, 80%, 60%)" />
        </linearGradient>
      </defs>
      
      {/* Central star node */}
      <motion.circle
        cx="12"
        cy="12"
        r="3.5"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        fill={isActive ? "currentColor" : "none"}
        fillOpacity={isActive ? 0.2 : 0}
        animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1.5, repeat: isHovered ? Infinity : 0 }}
      />
      
      {/* Orbital nodes with cosmic colors */}
      <motion.circle cx="12" cy="4" r="2" stroke={isHovered ? "hsl(180, 80%, 60%)" : "currentColor"} strokeWidth="1.5" fill="currentColor" fillOpacity={0.2} />
      <motion.circle cx="19" cy="16" r="2" stroke={isHovered ? "hsl(280, 70%, 65%)" : "currentColor"} strokeWidth="1.5" fill="currentColor" fillOpacity={0.2} />
      <motion.circle cx="5" cy="16" r="2" stroke={isHovered ? "hsl(var(--primary))" : "currentColor"} strokeWidth="1.5" fill="currentColor" fillOpacity={0.2} />
      
      {/* Energy connection lines */}
      <motion.g 
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"} 
        strokeWidth="1"
        animate={{ opacity: isHovered ? 1 : 0.35 }}
      >
        <line x1="12" y1="6" x2="12" y2="8.5" />
        <line x1="14.5" y1="14" x2="17.5" y2="15" />
        <line x1="9.5" y1="14" x2="6.5" y2="15" />
      </motion.g>
      
      {/* Orbital ring pulse */}
      {isHovered && (
        <motion.circle
          cx="12"
          cy="12"
          r="3.5"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          fill="none"
          initial={{ r: 3.5, opacity: 0.8 }}
          animate={{ r: 8, opacity: 0 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.svg>
  );
};

// Cosmic Video - Lens with aurora flare
export const CosmicVideoIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ scale: isHovered ? 1.12 : 1 }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(180, 80%, 60%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(280, 70%, 65%)" />
        </linearGradient>
        <radialGradient id={`${id}-lens`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      
      {/* Camera body */}
      <motion.rect
        x="2"
        y="6"
        width="14"
        height="12"
        rx="2.5"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        fill={isActive ? "currentColor" : "none"}
        fillOpacity={isActive ? 0.12 : 0}
      />
      
      {/* Cosmic lens with inner glow */}
      <motion.circle
        cx="9"
        cy="12"
        r="3"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        fill={`url(#${id}-lens)`}
        animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
      />
      
      {/* Broadcast beam */}
      <motion.path
        d="M17 9l5-2v10l-5-2"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.1}
      />
      
      {/* Live indicator with cosmic pulse */}
      {(isHovered || isActive) && (
        <>
          <motion.circle
            cx="5"
            cy="9"
            r="1.5"
            fill="hsl(0, 85%, 60%)"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <motion.circle
            cx="5"
            cy="9"
            r="1.5"
            fill="none"
            stroke="hsl(0, 85%, 60%)"
            strokeWidth="1"
            initial={{ r: 1.5, opacity: 0.8 }}
            animate={{ r: 4, opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </>
      )}
    </motion.svg>
  );
};

// Cosmic Files - Layered holographic documents
export const CosmicFilesIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ 
        scale: isHovered ? 1.12 : 1,
        y: isHovered ? -2 : 0
      }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(280, 80%, 70%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(180, 80%, 60%)" />
        </linearGradient>
      </defs>
      
      {/* Back holographic layer */}
      <motion.rect
        x="6"
        y="4"
        width="14"
        height="16"
        rx="2"
        stroke={isHovered ? "hsl(280, 70%, 65%)" : "currentColor"}
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity={0.05}
        animate={{ x: isHovered ? 7 : 6, opacity: isHovered ? 0.8 : 0.5 }}
        transition={cosmicSpring}
      />
      
      {/* Front layer */}
      <motion.rect
        x="4"
        y="6"
        width="14"
        height="16"
        rx="2"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        fill={isActive ? "currentColor" : "none"}
        fillOpacity={isActive ? 0.12 : 0}
        animate={{ x: isHovered ? 3 : 4 }}
        transition={cosmicSpring}
      />
      
      {/* Holographic data lines */}
      <motion.g 
        stroke={isHovered ? `url(#${id}-stroke)` : "currentColor"} 
        strokeWidth="1" 
        strokeLinecap="round" 
        animate={{ opacity: isHovered ? 1 : 0.4 }}
      >
        <line x1="7" y1="11" x2="15" y2="11" />
        <line x1="7" y1="14" x2="13" y2="14" />
        <line x1="7" y1="17" x2="11" y2="17" />
      </motion.g>
    </motion.svg>
  );
};

// Cosmic AI - Starburst neural core
export const CosmicAIIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size === "md" ? "lg" : size], className)}
      animate={{ 
        scale: isHovered ? 1.18 : 1,
        rotate: isHovered ? 20 : 0,
        filter: isActive || isHovered ? "drop-shadow(0 0 10px hsl(var(--primary)))" : "none"
      }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(280, 80%, 70%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(180, 80%, 60%)" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      
      {/* Outer starburst rays */}
      <motion.path
        d="M12 2v4m0 12v4m-10-10h4m12 0h4"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Diagonal rays */}
      <motion.path
        d="M5.64 5.64l2.83 2.83m7.06 7.06l2.83 2.83m0-12.72l-2.83 2.83m-7.06 7.06l-2.83 2.83"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{ opacity: isHovered ? 1 : 0.5 }}
      />
      
      {/* Neural core ring */}
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        fill={`url(#${id}-core)`}
      />
      
      {/* Inner spark */}
      <motion.circle
        cx="12"
        cy="12"
        r="2"
        fill="currentColor"
        fillOpacity={isHovered || isActive ? 0.6 : 0.3}
        animate={isHovered ? { scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 1, repeat: isHovered ? Infinity : 0 }}
      />
      
      {/* Orbiting particle */}
      {isHovered && (
        <motion.circle
          cx="16"
          cy="8"
          r="1"
          fill="hsl(180, 80%, 60%)"
          animate={{ 
            rotate: 360,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "12px 12px" }}
        />
      )}
    </motion.svg>
  );
};

// Cosmic Crown - Crystalline aurora crown
export const CosmicCrownIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ 
        scale: isHovered ? 1.15 : 1,
        y: isHovered ? -3 : 0,
        filter: isHovered ? "drop-shadow(0 0 8px hsl(var(--primary) / 0.6))" : "none"
      }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(45, 90%, 65%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(280, 70%, 65%)" />
        </linearGradient>
      </defs>
      
      {/* Crown shape with cosmic gradient */}
      <motion.path
        d="M3 6l3 10h12l3-10-5 4-4-6-4 6-5-4z"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={isActive ? "currentColor" : "none"}
        fillOpacity={isActive ? 0.15 : 0}
      />
      
      {/* Base */}
      <motion.line x1="4" y1="20" x2="20" y2="20" stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"} strokeWidth="2" strokeLinecap="round" />
      
      {/* Cosmic gems */}
      <motion.circle cx="8" cy="11" r="1.2" fill={isHovered ? "hsl(180, 80%, 60%)" : "currentColor"} fillOpacity={isHovered ? 1 : 0.4} />
      <motion.circle cx="12" cy="8" r="1.5" fill={isHovered ? "hsl(var(--primary))" : "currentColor"} fillOpacity={isHovered ? 1 : 0.5} />
      <motion.circle cx="16" cy="11" r="1.2" fill={isHovered ? "hsl(280, 70%, 65%)" : "currentColor"} fillOpacity={isHovered ? 1 : 0.4} />
      
      {/* Sparkle effect */}
      {isHovered && (
        <>
          <motion.path
            d="M6 3l0.5 1.5M18 3l-0.5 1.5M12 1l0 1.5"
            stroke="hsl(45, 90%, 70%)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: [0, 1, 0], y: [2, 0, -2] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.2 }}
          />
        </>
      )}
    </motion.svg>
  );
};

// Cosmic Shield - Protective energy barrier
export const CosmicShieldIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ 
        scale: isHovered ? 1.12 : 1,
        filter: isHovered ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" : "none"
      }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(180, 80%, 60%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(280, 70%, 65%)" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      
      {/* Shield outline with cosmic gradient */}
      <motion.path
        d="M12 3L4 7v6c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5V7l-8-4z"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={isActive || isHovered ? `url(#${id}-glow)` : "none"}
      />
      
      {/* Inner energy field */}
      <motion.path
        d="M12 6l-5 2.5v4c0 3.5 2.5 6.5 5 7.5 2.5-1 5-4 5-7.5v-4L12 6z"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1"
        fill="none"
        opacity={0.3}
      />
      
      {/* Checkmark with animation */}
      <motion.path
        d="M9 12l2 2 4-4"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0.8 }}
        animate={{ 
          pathLength: isHovered ? 1 : 0.8,
          opacity: isHovered ? 1 : 0.6
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.svg>
  );
};

// Cosmic Settings - Rotating nebula gear
export const CosmicSettingsIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ 
        rotate: isHovered ? 120 : 0,
        scale: isHovered ? 1.12 : 1,
        filter: isHovered ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))" : "none"
      }}
      transition={cosmicSpring}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(280, 80%, 70%)" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(180, 80%, 60%)" />
        </linearGradient>
      </defs>
      
      {/* Outer cosmic rays */}
      <motion.path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Center orb */}
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        stroke={isActive || isHovered ? `url(#${id}-stroke)` : "currentColor"}
        strokeWidth="1.5"
        fill={isActive ? "currentColor" : "none"}
        fillOpacity={isActive ? 0.15 : 0}
      />
      
      {/* Inner core */}
      <motion.circle
        cx="12"
        cy="12"
        r="1.5"
        fill="currentColor"
        fillOpacity={isHovered || isActive ? 0.6 : 0.3}
      />
    </motion.svg>
  );
};

// Cosmic More - Expanding constellation dots
export const CosmicMoreIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => {
  const id = useUniqueId();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(sizeMap[size], className)}
      animate={{ scale: isHovered ? 1.1 : 1 }}
      transition={cosmicSpring}
    >
      <defs>
        <radialGradient id={`${id}-dot1`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(180, 80%, 70%)" />
          <stop offset="100%" stopColor="hsl(180, 80%, 50%)" />
        </radialGradient>
        <radialGradient id={`${id}-dot2`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </radialGradient>
        <radialGradient id={`${id}-dot3`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(280, 70%, 70%)" />
          <stop offset="100%" stopColor="hsl(280, 70%, 55%)" />
        </radialGradient>
      </defs>
      
      <motion.circle
        cx="6"
        cy="12"
        r="2"
        fill={isHovered ? `url(#${id}-dot1)` : "currentColor"}
        animate={{ x: isHovered ? -2 : 0, scale: isHovered ? 1.1 : 1 }}
        transition={cosmicSpring}
        style={{ filter: isHovered ? "drop-shadow(0 0 4px hsl(180, 80%, 60%))" : "none" }}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="2"
        fill={isHovered ? `url(#${id}-dot2)` : "currentColor"}
        animate={{ scale: isHovered ? 1.3 : 1 }}
        transition={cosmicSpring}
        style={{ filter: isHovered ? "drop-shadow(0 0 6px hsl(var(--primary)))" : "none" }}
      />
      <motion.circle
        cx="18"
        cy="12"
        r="2"
        fill={isHovered ? `url(#${id}-dot3)` : "currentColor"}
        animate={{ x: isHovered ? 2 : 0, scale: isHovered ? 1.1 : 1 }}
        transition={cosmicSpring}
        style={{ filter: isHovered ? "drop-shadow(0 0 4px hsl(280, 70%, 65%))" : "none" }}
      />
    </motion.svg>
  );
};

// Export with namespaced names
export {
  CosmicHomeIcon as HomeIcon,
  CosmicChatIcon as ChatIcon,
  CosmicTeamsIcon as TeamsIcon,
  CosmicVideoIcon as VideoIcon,
  CosmicFilesIcon as FilesIcon,
  CosmicAIIcon as AIIcon,
  CosmicCrownIcon as CrownIcon,
  CosmicShieldIcon as ShieldIcon,
  CosmicSettingsIcon as SettingsIcon,
  CosmicMoreIcon as MoreIcon,
};
