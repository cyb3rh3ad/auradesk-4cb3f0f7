import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CosmicInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  glowOnFocus?: boolean;
}

const CosmicInput = React.forwardRef<HTMLInputElement, CosmicInputProps>(
  ({ className, type, glowOnFocus = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    return (
      <div className="relative">
        {/* Cosmic glow border on focus */}
        {glowOnFocus && (
          <motion.div
            className="absolute -inset-0.5 rounded-xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg, 
                hsl(180 80% 60% / 0.5) 0%,
                hsl(var(--primary) / 0.4) 50%,
                hsl(280 70% 65% / 0.5) 100%
              )`,
              filter: 'blur(6px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isFocused ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        {/* Aurora border */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, 
              hsl(180 80% 60% / ${isFocused ? 0.6 : 0.2}) 0%,
              hsl(var(--primary) / ${isFocused ? 0.5 : 0.15}) 50%,
              hsl(280 70% 65% / ${isFocused ? 0.6 : 0.2}) 100%
            )`,
            padding: '1px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{ opacity: isFocused ? 1 : 0.7 }}
          transition={{ duration: 0.2 }}
        />
        
        <input
          type={type}
          className={cn(
            "relative flex h-11 w-full rounded-xl bg-card/60 backdrop-blur-sm px-4 py-2 text-sm",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200",
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </div>
    );
  }
);
CosmicInput.displayName = "CosmicInput";

export { CosmicInput };
