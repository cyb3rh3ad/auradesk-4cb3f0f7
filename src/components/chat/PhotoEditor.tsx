import { useState, useRef, useCallback, useEffect } from 'react';
import { Pencil, Type, Undo2, Send, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/utils/haptics';

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

interface PhotoEditorProps {
  imageUrl: string;
  onSend: (editedDataUrl: string) => void;
  onRetake: () => void;
}

const COLORS = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#5AC8FA',
];

const BRUSH_SIZES = [3, 6, 10];

export const PhotoEditor = ({ imageUrl, onSend, onRetake }: PhotoEditorProps) => {
  const [mode, setMode] = useState<'none' | 'draw' | 'text'>('none');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(6);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasInitialized = useRef(false);

  // Load image and set up canvas
  useEffect(() => {
    if (canvasInitialized.current) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Size canvas to fill container while maintaining aspect ratio
      const containerRect = container.getBoundingClientRect();
      const scale = Math.min(containerRect.width / img.width, containerRect.height / img.height);
      canvas.width = containerRect.width;
      canvas.height = containerRect.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw image centered
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (canvas.width - drawW) / 2;
      const offsetY = (canvas.height - drawH) / 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      canvasInitialized.current = true;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getCanvasPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setDrawHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || drawHistory.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prev = drawHistory[drawHistory.length - 1];
    ctx.putImageData(prev, 0, 0);
    setDrawHistory(h => h.slice(0, -1));
    triggerHaptic('light');
  }, [drawHistory]);

  // Drawing handlers
  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    saveState();
    isDrawing.current = true;
    lastPoint.current = getCanvasPoint(e);
  }, [mode, getCanvasPoint, saveState]);

  const moveDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current || mode !== 'draw') return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point || !lastPoint.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize * (canvas.width / containerRef.current!.getBoundingClientRect().width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPoint.current = point;
  }, [mode, getCanvasPoint, selectedColor, brushSize]);

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  // Text placement
  const handleCanvasTap = useCallback((e: React.MouseEvent) => {
    if (mode !== 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newId = `text_${Date.now()}`;
    setEditingTextId(newId);
    setTextInput('');
    setTextOverlays(prev => [...prev, { id: newId, text: '', x, y, color: selectedColor, fontSize: 24 }]);
    triggerHaptic('light');
  }, [mode, selectedColor]);

  const confirmText = useCallback(() => {
    if (!editingTextId) return;
    if (!textInput.trim()) {
      // Remove empty text
      setTextOverlays(prev => prev.filter(t => t.id !== editingTextId));
    } else {
      setTextOverlays(prev => prev.map(t => t.id === editingTextId ? { ...t, text: textInput } : t));
    }
    setEditingTextId(null);
    setTextInput('');
  }, [editingTextId, textInput]);

  // Flatten everything and send
  const handleSend = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw text overlays onto canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    textOverlays.forEach(overlay => {
      if (!overlay.text) return;
      const x = (overlay.x / 100) * canvas.width;
      const y = (overlay.y / 100) * canvas.height;
      const fontSize = overlay.fontSize * (canvas.width / (containerRef.current?.getBoundingClientRect().width || canvas.width));

      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text shadow for readability
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = fontSize / 8;
      ctx.lineJoin = 'round';
      ctx.strokeText(overlay.text, x, y);

      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, x, y);
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSend(dataUrl);
  }, [textOverlays, onSend]);

  // Dragging text overlays
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const startDragText = useCallback((e: React.TouchEvent | React.MouseEvent, overlay: TextOverlay) => {
    if (mode === 'draw') return;
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const currentX = (overlay.x / 100) * rect.width;
    const currentY = (overlay.y / 100) * rect.height;
    dragRef.current = {
      id: overlay.id,
      offsetX: clientX - rect.left - currentX,
      offsetY: clientY - rect.top - currentY,
    };
  }, [mode]);

  useEffect(() => {
    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const x = ((clientX - rect.left - dragRef.current.offsetX) / rect.width) * 100;
      const y = ((clientY - rect.top - dragRef.current.offsetY) / rect.height) * 100;

      setTextOverlays(prev => prev.map(t => t.id === dragRef.current!.id ? { ...t, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : t));
    };

    const handleEnd = () => { dragRef.current = null; };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 safe-area-pt">
        <button onClick={onRetake} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white touch-manipulation">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {drawHistory.length > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleUndo}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white touch-manipulation"
            >
              <Undo2 className="w-5 h-5" />
            </motion.button>
          )}

          <button
            onClick={() => { setMode(mode === 'draw' ? 'none' : 'draw'); setShowColorPicker(false); }}
            className={cn(
              "w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center touch-manipulation transition-colors",
              mode === 'draw' ? 'bg-white text-black' : 'bg-black/40 text-white'
            )}
          >
            <Pencil className="w-5 h-5" />
          </button>

          <button
            onClick={() => { setMode(mode === 'text' ? 'none' : 'text'); setShowColorPicker(false); }}
            className={cn(
              "w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center touch-manipulation transition-colors",
              mode === 'text' ? 'bg-white text-black' : 'bg-black/40 text-white'
            )}
          >
            <Type className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Color picker (slide down when draw or text mode) */}
      <AnimatePresence>
        {(mode === 'draw' || mode === 'text') && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 z-20 flex items-center justify-center gap-2 px-4 safe-area-pt"
          >
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-3 py-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform touch-manipulation",
                    selectedColor === color ? 'border-white scale-125' : 'border-transparent scale-100'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {mode === 'draw' && (
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-3 py-2">
                {BRUSH_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={cn(
                      "rounded-full bg-white transition-all touch-manipulation",
                      brushSize === size ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50' : ''
                    )}
                    style={{ width: size * 2 + 8, height: size * 2 + 8 }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas & image area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: mode === 'draw' ? 'none' : 'auto' }}
          onMouseDown={mode === 'draw' ? startDraw : undefined}
          onMouseMove={mode === 'draw' ? moveDraw : undefined}
          onMouseUp={mode === 'draw' ? endDraw : undefined}
          onMouseLeave={mode === 'draw' ? endDraw : undefined}
          onTouchStart={mode === 'draw' ? startDraw : undefined}
          onTouchMove={mode === 'draw' ? moveDraw : undefined}
          onTouchEnd={mode === 'draw' ? endDraw : undefined}
          onClick={mode === 'text' ? handleCanvasTap : undefined}
        />

        {/* Text overlays */}
        {textOverlays.map(overlay => (
          <div
            key={overlay.id}
            className="absolute select-none cursor-move"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => startDragText(e, overlay)}
            onTouchStart={(e) => startDragText(e, overlay)}
          >
            {editingTextId === overlay.id ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmText()}
                  placeholder="Type here..."
                  className="bg-black/50 backdrop-blur-sm text-white border border-white/30 rounded-lg px-3 py-1.5 text-lg font-bold outline-none min-w-[120px]"
                  style={{ color: selectedColor }}
                />
                <button onClick={confirmText} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white touch-manipulation">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : overlay.text ? (
              <p
                className="text-2xl font-bold pointer-events-none whitespace-nowrap"
                style={{
                  color: overlay.color,
                  textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.9)',
                }}
              >
                {overlay.text}
              </p>
            ) : null}
          </div>
        ))}

        {/* Mode hint */}
        <AnimatePresence>
          {mode === 'text' && textOverlays.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center text-white/60 text-sm font-medium pointer-events-none"
            >
              Tap anywhere to add text
            </motion.p>
          )}
          {mode === 'draw' && drawHistory.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center text-white/60 text-sm font-medium pointer-events-none"
            >
              Draw on the photo
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="bg-black/80 backdrop-blur-xl px-6 py-6 safe-area-pb">
        <div className="flex items-center justify-between">
          <button
            onClick={onRetake}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-manipulation"
          >
            <X className="w-6 h-6" />
          </button>

          <motion.button
            onClick={handleSend}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/40 touch-manipulation"
          >
            <Send className="w-7 h-7" />
          </motion.button>

          <div className="w-14" />
        </div>
      </div>
    </div>
  );
};
