import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface HeartBurstAnimationProps {
  trigger: number; // increment to trigger
}

export const HeartBurstAnimation = ({ trigger }: HeartBurstAnimationProps) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; scale: number; rotate: number; delay: number }[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 120,
      y: -30 - Math.random() * 80,
      scale: 0.8 + Math.random() * 1.4,
      rotate: (Math.random() - 0.5) * 60,
      delay: Math.random() * 0.15,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 1800);
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
              opacity: [1, 1, 0.8, 0],
              scale: [0, p.scale * 1.3, p.scale],
              x: `calc(50% + ${p.x}px)`,
              y: `calc(50% + ${p.y}px)`,
              rotate: p.rotate,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: p.delay }}
            className="absolute text-2xl drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            style={{ filter: 'saturate(1.4)' }}
          >
            ❤️
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
};
