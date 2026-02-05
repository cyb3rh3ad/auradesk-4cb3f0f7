import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cosmicButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        outline: "border border-border/50 bg-transparent hover:bg-accent/10",
        ghost: "hover:bg-accent/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface CosmicButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'>,
    VariantProps<typeof cosmicButtonVariants> {
  asChild?: boolean;
  glowIntensity?: "low" | "medium" | "high";
}

const CosmicButton = React.forwardRef<HTMLButtonElement, CosmicButtonProps>(
  ({ className, variant, size, asChild = false, glowIntensity = "medium", children, ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);
    
    const glowOpacity = {
      low: { base: 0.2, hover: 0.35 },
      medium: { base: 0.3, hover: 0.5 },
      high: { base: 0.4, hover: 0.7 },
    };
    
    const Comp = asChild ? Slot : "button";
    
    if (variant === "outline" || variant === "ghost" || variant === "link") {
      return (
        <Comp
          className={cn(cosmicButtonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    
    // Extract only the props we need for the button
    const { onClick, disabled, type, id, name } = props;
    
    return (
      <motion.button
        ref={ref}
        className={cn(cosmicButtonVariants({ variant, size, className }))}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        disabled={disabled}
        type={type}
        id={id}
        name={name}
      >
        {/* Cosmic gradient background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, 
              hsl(180 80% 50%) 0%,
              hsl(var(--primary)) 35%,
              hsl(280 70% 55%) 70%,
              hsl(320 70% 55%) 100%
            )`,
          }}
        />
        
        {/* Shimmer sweep effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              hsl(0 0% 100% / 0.2) 50%, 
              transparent 100%
            )`,
          }}
          initial={{ x: '-100%' }}
          animate={isHovered ? { x: '200%' } : { x: '-100%' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
        
        {/* Inner glow */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, 
              hsl(0 0% 100% / 0.15) 0%, 
              transparent 50%
            )`,
          }}
        />
        
        {/* Outer glow */}
        <motion.div
          className="absolute -inset-1 rounded-2xl pointer-events-none -z-10"
          style={{
            background: `linear-gradient(135deg, 
              hsl(180 80% 60% / ${glowOpacity[glowIntensity].base}),
              hsl(var(--primary) / ${glowOpacity[glowIntensity].base}),
              hsl(280 70% 65% / ${glowOpacity[glowIntensity].base})
            )`,
            filter: 'blur(12px)',
          }}
          animate={{
            opacity: isHovered ? glowOpacity[glowIntensity].hover : glowOpacity[glowIntensity].base,
          }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </motion.button>
    );
  }
);
CosmicButton.displayName = "CosmicButton";

export { CosmicButton, cosmicButtonVariants };
