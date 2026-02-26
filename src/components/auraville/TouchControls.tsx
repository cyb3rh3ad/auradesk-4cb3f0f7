import { useRef, useCallback, useEffect } from 'react';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
}

export const TouchControls = ({ onMove }: TouchControlsProps) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const knobRef = useRef<HTMLDivElement>(null);
  const RADIUS = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.touches[0];
    touchIdRef.current = touch.identifier;
    const rect = outerRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
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

    // Update knob position
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    // Normalize to -1..1
    onMove(dx / RADIUS, dy / RADIUS);
  }, [onMove]);

  const handleTouchEnd = useCallback(() => {
    touchIdRef.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
    onMove(0, 0);
  }, [onMove]);

  return (
    <div
      className="fixed bottom-28 left-6 z-50 touch-none select-none"
      style={{ width: RADIUS * 2 + 20, height: RADIUS * 2 + 20 }}
    >
      {/* Outer ring */}
      <div
        ref={outerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full h-full rounded-full border-2 border-white/20 bg-black/20 backdrop-blur-sm flex items-center justify-center"
      >
        {/* Inner knob */}
        <div
          ref={knobRef}
          className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/40 shadow-lg transition-none"
          style={{ willChange: 'transform' }}
        />
      </div>

      {/* D-pad indicators */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="absolute top-1 text-white/20 text-xs font-bold">▲</span>
        <span className="absolute bottom-1 text-white/20 text-xs font-bold">▼</span>
        <span className="absolute left-1 text-white/20 text-xs font-bold">◄</span>
        <span className="absolute right-1 text-white/20 text-xs font-bold">►</span>
      </div>
    </div>
  );
};
