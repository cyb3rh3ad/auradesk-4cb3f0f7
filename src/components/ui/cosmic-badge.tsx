import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cosmicBadgeVariants = cva(
  "relative inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-foreground",
        primary: "text-primary-foreground",
        outline: "border border-primary/30 text-foreground",
        success: "text-white",
        warning: "text-white",
        destructive: "text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CosmicBadgeProps
  extends VariantProps<typeof cosmicBadgeVariants> {
  className?: string;
  animated?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
}

function CosmicBadge({
  className,
  variant,
  animated = true,
  glow = false,
  children,
}: CosmicBadgeProps) {
  const getGradient = () => {
    switch (variant) {
      case "primary":
        return "linear-gradient(135deg, hsl(180 80% 50%) 0%, hsl(var(--primary)) 50%, hsl(280 70% 55%) 100%)";
      case "success":
        return "linear-gradient(135deg, hsl(160 80% 45%) 0%, hsl(142 70% 45%) 100%)";
      case "warning":
        return "linear-gradient(135deg, hsl(45 90% 50%) 0%, hsl(25 95% 53%) 100%)";
      case "destructive":
        return "linear-gradient(135deg, hsl(0 70% 50%) 0%, hsl(340 80% 50%) 100%)";
      default:
        return "linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(280 70% 55% / 0.15) 100%)";
    }
  };
  
  return (
    <motion.div
      className={cn(cosmicBadgeVariants({ variant }), className)}
      whileHover={animated ? { scale: 1.05 } : undefined}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{ background: getGradient() }}
      />
      
      {/* Shimmer effect */}
      {animated && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.2) 50%, transparent 100%)",
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}
      
      {/* Outer glow */}
      {glow && (
        <div
          className="absolute -inset-1 rounded-full -z-10"
          style={{
            background: getGradient(),
            filter: 'blur(8px)',
            opacity: 0.4,
          }}
        />
      )}
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.div>
  );
}

export { CosmicBadge, cosmicBadgeVariants };
