import { motion } from "framer-motion";
import { useState, memo } from "react";
import { cn } from "@/lib/utils";

interface SparklingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "cosmic" | "outline" | "slate";
  href?: string;
  download?: boolean;
  disabled?: boolean;
}

// Polar ray colors - blue-green aurora spectrum
const polarColors = [
  'hsl(175, 85%, 55%)',  // cyan-teal
  'hsl(165, 80%, 50%)',  // teal
  'hsl(185, 85%, 55%)',  // light cyan
  'hsl(195, 80%, 55%)',  // sky blue
  'hsl(170, 75%, 50%)',  // sea green
];

const slateColors = [
  'hsl(220, 15%, 60%)',
  'hsl(220, 15%, 65%)',
  'hsl(220, 15%, 55%)',
  'hsl(220, 15%, 70%)',
];

export const SparklingButton = memo(({
  children,
  onClick,
  className,
  variant = "cosmic",
  href,
  download,
  disabled,
}: SparklingButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const particleColors = variant === "slate" ? slateColors : polarColors;

  // For outline variant, use simpler styling
  if (variant === "outline") {
    const content = (
      <>
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, hsl(175 85% 55% / 0.15) 50%, transparent 100%)`,
          }}
          animate={isHovered ? { x: ['-100%', '200%'], opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {isHovered && polarColors.slice(0, 4).map((color, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 3 + Math.random() * 2,
              height: 3 + Math.random() * 2,
              background: color,
              left: `${15 + i * 20}%`,
              top: '50%',
              boxShadow: `0 0 6px ${color}`,
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: [0, -18, -30], x: [0, (i - 1.5) * 5] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeOut' }}
          />
        ))}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </>
    );

    const props = {
      className: cn(
        "relative overflow-hidden inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300",
        "border-2 border-teal-500/30 hover:border-teal-500/60 bg-transparent hover:bg-teal-500/10 text-foreground",
        className
      ),
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    };

    if (href) {
      return (
        <motion.a href={href} download={download} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} {...props}>
          {content}
        </motion.a>
      );
    }
    return (
      <motion.button onClick={onClick} disabled={disabled} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} {...props}>
        {content}
      </motion.button>
    );
  }

  // For slate variant
  if (variant === "slate") {
    const content = (
      <>
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, 
              hsl(220 15% 18% / 0.95) 0%, 
              hsl(220 20% 22% / 0.9) 50%, 
              hsl(220 15% 18% / 0.95) 100%
            )`,
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            background: `linear-gradient(135deg, 
              hsl(220 15% 50% / ${isHovered ? 0.5 : 0.25}) 0%, 
              hsl(220 20% 55% / ${isHovered ? 0.4 : 0.2}) 50%,
              hsl(220 15% 50% / ${isHovered ? 0.5 : 0.25}) 100%
            )`,
            padding: '1.5px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          animate={{ opacity: isHovered ? 1 : 0.7 }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, hsl(220 15% 60% / 0.2) 50%, transparent 100%)`,
          }}
          animate={isHovered ? { x: ['-100%', '200%'], opacity: 1 } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {isHovered && slateColors.map((color, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 3 + Math.random() * 2,
              height: 3 + Math.random() * 2,
              background: color,
              left: `${15 + i * 20}%`,
              top: '50%',
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: [0, -15, -30], x: [0, (i - 1.5) * 5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeOut' }}
          />
        ))}
        <span className="relative z-10 flex items-center gap-2 text-slate-200">{children}</span>
      </>
    );

    const props = {
      className: cn(
        "relative overflow-hidden inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300",
        className
      ),
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    };

    if (href) {
      return (
        <motion.a href={href} download={download} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} {...props}>
          {content}
        </motion.a>
      );
    }
    return (
      <motion.button onClick={onClick} disabled={disabled} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} {...props}>
        {content}
      </motion.button>
    );
  }

  // Cosmic variant (default) - polar ray effect
  const content = (
    <>
      {/* Deep aurora background - more vibrant */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, hsl(175 80% 50% / 0.2) 0%, transparent 50%),
            linear-gradient(135deg, 
              hsl(175 70% 22%) 0%, 
              hsl(165 65% 26%) 35%,
              hsl(180 70% 24%) 65%,
              hsl(170 65% 22%) 100%
            )
          `,
        }}
      />
      
      {/* Polar ray border glow - stronger */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: `linear-gradient(135deg, 
            hsl(175 90% 55% / ${isHovered ? 0.8 : 0.45}) 0%, 
            hsl(165 85% 50% / ${isHovered ? 0.7 : 0.4}) 25%,
            hsl(185 90% 55% / ${isHovered ? 0.75 : 0.42}) 50%, 
            hsl(195 85% 55% / ${isHovered ? 0.7 : 0.4}) 75%,
            hsl(170 90% 50% / ${isHovered ? 0.8 : 0.45}) 100%
          )`,
          padding: '1.5px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{ opacity: isHovered ? 1 : 0.7 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Animated polar sweep */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, 
            transparent 0%, 
            hsl(175 85% 55% / 0.25) 25%,
            hsl(185 90% 55% / 0.22) 50%, 
            hsl(175 85% 55% / 0.25) 75%,
            transparent 100%
          )`,
        }}
        animate={isHovered ? { x: ['-100%', '200%'], opacity: 1 } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Floating particles - spread across entire button */}
      {isHovered && [...Array(12)].map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              background: polarColors[i % polarColors.length],
              left: `${8 + col * 25 + Math.random() * 15}%`,
              top: `${20 + row * 30}%`,
              boxShadow: `0 0 8px ${polarColors[i % polarColors.length]}`,
            }}
            initial={{ opacity: 0, y: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [0, -20 - Math.random() * 15, -40],
              x: [0, (Math.random() - 0.5) * 20],
              scale: [0, 1, 0.5],
            }}
            transition={{
              duration: 1 + Math.random() * 0.5,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeOut',
            }}
          />
        );
      })}
      
      {/* Content */}
      <motion.span
        className="relative z-10 flex items-center gap-2 text-sm font-medium"
        style={{
          background: isHovered 
            ? 'linear-gradient(90deg, hsl(175, 85%, 70%), hsl(165, 80%, 65%), hsl(185, 85%, 70%))' 
            : 'none',
          WebkitBackgroundClip: isHovered ? 'text' : 'unset',
          WebkitTextFillColor: isHovered ? 'transparent' : 'hsl(0 0% 95%)',
          color: 'hsl(0 0% 95%)',
        }}
      >
        {children}
      </motion.span>
    </>
  );

  const props = {
    className: cn(
      "relative overflow-hidden inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
      className
    ),
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (href) {
    return (
      <motion.a href={href} download={download} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} {...props}>
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button onClick={onClick} disabled={disabled} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} {...props}>
      {content}
    </motion.button>
  );
});

SparklingButton.displayName = "SparklingButton";
