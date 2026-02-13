import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface HeartBurstAnimationProps {
  trigger: number;
}

export const HeartBurstAnimation = ({ trigger }: HeartBurstAnimationProps) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; scale: number; rotate: number; delay: number }[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const newParticles = Array.from({ length: 16 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 160,
      y: -40 - Math.random() * 100,
      scale: 1.0 + Math.random() * 1.6,
      rotate: (Math.random() - 0.5) * 70,
      delay: Math.random() * 0.2,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 3500);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[100]" style={{ overflow: 'visible' }}>
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, scale: 0, x: '50%', y: '50%' }}
            animate={{
              opacity: [1, 1, 1, 0.9, 0],
              scale: [0, p.scale * 1.5, p.scale * 1.1, p.scale],
              x: `calc(50% + ${p.x}px)`,
              y: `calc(50% + ${p.y}px)`,
              rotate: p.rotate,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut', delay: p.delay }}
            className="absolute text-3xl drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]"
            style={{ filter: 'saturate(1.5)' }}
          >
            ❤️
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
};
