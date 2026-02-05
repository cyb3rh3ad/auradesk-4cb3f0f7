import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CosmicCardProps {
  className?: string;
  variant?: "default" | "glow" | "intense";
  animated?: boolean;
  children?: React.ReactNode;
}

const CosmicCard = React.forwardRef<HTMLDivElement, CosmicCardProps>(
  ({ className, variant = "default", animated = true, children }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);
    
    const baseStyles = "relative rounded-2xl overflow-hidden";
    
    const variants = {
      default: "bg-card/60 backdrop-blur-xl",
      glow: "bg-card/40 backdrop-blur-2xl",
      intense: "bg-card/30 backdrop-blur-3xl",
    };
    
    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={animated ? { scale: 1.02, y: -4 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Cosmic aurora border */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, 
              hsl(180 80% 60% / ${isHovered ? 0.4 : 0.2}) 0%,
              hsl(var(--primary) / ${isHovered ? 0.35 : 0.15}) 50%,
              hsl(280 70% 65% / ${isHovered ? 0.4 : 0.2}) 100%
            )`,
            padding: '1px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{ opacity: isHovered ? 1 : 0.7 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Top highlight */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              hsl(0 0% 100% / 0.1) 50%, 
              transparent 100%
            )`,
          }}
        />
        
        {/* Ambient glow on hover */}
        {animated && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 80% 50% at 50% 0%, 
                hsl(var(--primary) / 0.15) 0%, 
                transparent 50%
              )`,
            }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Bottom glow */}
        <motion.div
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{
            background: `linear-gradient(to top, 
              hsl(var(--primary) / 0.05) 0%, 
              transparent 100%
            )`,
          }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    );
  }
);
CosmicCard.displayName = "CosmicCard";

const CosmicCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CosmicCardHeader.displayName = "CosmicCardHeader";

const CosmicCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight text-cosmic",
      className
    )}
    {...props}
  />
));
CosmicCardTitle.displayName = "CosmicCardTitle";

const CosmicCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CosmicCardDescription.displayName = "CosmicCardDescription";

const CosmicCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CosmicCardContent.displayName = "CosmicCardContent";

const CosmicCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CosmicCardFooter.displayName = "CosmicCardFooter";

export {
  CosmicCard,
  CosmicCardHeader,
  CosmicCardFooter,
  CosmicCardTitle,
  CosmicCardDescription,
  CosmicCardContent,
};
