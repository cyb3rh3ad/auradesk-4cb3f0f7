import { useRef, useCallback } from 'react';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
}

export const TouchControls = ({ onMove }: TouchControlsProps) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const knobRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const RADIUS = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.touches[0];
    touchIdRef.current = touch.identifier;
    const rect = outerRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    if (glowRef.current) glowRef.current.style.opacity = '1';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
    if (!touch) return;

    let dx = touch.clientX - centerRef.current.x;
    let dy = touch.clientY - centerRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(${1 + dist / RADIUS * 0.1})`;
    }

    onMove(dx / RADIUS, dy / RADIUS);
  }, [onMove]);

  const handleTouchEnd = useCallback(() => {
    touchIdRef.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
    if (glowRef.current) glowRef.current.style.opacity = '0';
    onMove(0, 0);
  }, [onMove]);

  return (
    <div
      className="fixed bottom-28 left-6 z-50 touch-none select-none"
      style={{ width: RADIUS * 2 + 20, height: RADIUS * 2 + 20 }}
    >
      {/* Glow ring */}
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-full transition-opacity duration-200"
        style={{
          opacity: 0,
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          transform: 'scale(1.3)',
        }}
      />

      {/* Outer ring */}
      <div
        ref={outerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{
          border: '2px solid rgba(255,255,255,0.15)',
          background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.08), rgba(0,0,0,0.25))',
          backdropFilter: 'blur(8px)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {/* Inner knob */}
        <div
          ref={knobRef}
          className="w-12 h-12 rounded-full"
          style={{
            willChange: 'transform',
            background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.45), rgba(255,255,255,0.15))',
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2)',
            transition: 'box-shadow 0.15s ease',
          }}
        />
      </div>

      {/* D-pad indicators with subtle styling */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="absolute top-2 text-white/15 text-[10px] font-bold">▲</span>
        <span className="absolute bottom-2 text-white/15 text-[10px] font-bold">▼</span>
        <span className="absolute left-2 text-white/15 text-[10px] font-bold">◄</span>
        <span className="absolute right-2 text-white/15 text-[10px] font-bold">►</span>
      </div>
    </div>
  );
};
