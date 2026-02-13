import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface HeartBurstAnimationProps {
  trigger: number; // increment to trigger
}

export const HeartBurstAnimation = ({ trigger }: HeartBurstAnimationProps) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; scale: number; rotate: number }[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 60,
      y: -20 - Math.random() * 40,
      scale: 0.5 + Math.random() * 0.8,
      rotate: (Math.random() - 0.5) * 40,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 700);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-10">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, scale: 0, x: '50%', y: '50%' }}
            animate={{
              opacity: 0,
              scale: p.scale,
              x: `calc(50% + ${p.x}px)`,
              y: `calc(50% + ${p.y}px)`,
              rotate: p.rotate,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute text-lg"
          >
            ❤️
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
};
