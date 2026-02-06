import { motion } from "framer-motion";
import { useState, memo } from "react";
import { cn } from "@/lib/utils";

interface SparklingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "aurora" | "outline" | "slate";
  href?: string;
  download?: boolean;
  disabled?: boolean;
}

const auroraColors = [
  'hsl(180, 85%, 60%)',  // cyan
  'hsl(165, 80%, 55%)',  // teal
  'hsl(200, 85%, 60%)',  // blue
  'hsl(190, 80%, 55%)',  // cyan-teal
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
  variant = "aurora",
  href,
  download,
  disabled,
}: SparklingButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyles = "relative overflow-hidden inline-flex items-center justify-center font-medium rounded-full transition-all duration-300";
  
  const variantStyles = {
    aurora: "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40",
    outline: "border-2 border-cyan-500/30 hover:border-cyan-500/60 bg-transparent hover:bg-cyan-500/10 text-foreground",
    slate: "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 text-white shadow-lg shadow-slate-500/30",
  };

  const particleColors = variant === "slate" ? slateColors : auroraColors;

  const content = (
    <>
      {/* Aurora sweep effect */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background: variant === "outline" 
            ? `linear-gradient(90deg, transparent 0%, hsl(180 85% 55% / 0.15) 50%, transparent 100%)`
            : `linear-gradient(90deg, transparent 0%, hsl(180 85% 55% / 0.25) 25%, hsl(165 80% 55% / 0.2) 50%, hsl(180 85% 55% / 0.25) 75%, transparent 100%)`,
        }}
        animate={isHovered ? {
          x: ['-100%', '200%'],
          opacity: 1,
        } : { opacity: 0 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating particles */}
      {isHovered && (
        <>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 3 + Math.random() * 3,
                height: 3 + Math.random() * 3,
                background: particleColors[i % particleColors.length],
                left: `${10 + i * 18}%`,
                top: '50%',
                boxShadow: `0 0 6px ${particleColors[i % particleColors.length]}`,
              }}
              initial={{ opacity: 0, y: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                y: [0, -20, -35],
                x: [0, (i - 2) * 4],
                scale: [0, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </>
  );

  const commonProps = {
    className: cn(baseStyles, variantStyles[variant], className),
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (href) {
    return (
      <motion.a
        href={href}
        download={download}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...commonProps}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...commonProps}
    >
      {content}
    </motion.button>
  );
});

SparklingButton.displayName = "SparklingButton";
