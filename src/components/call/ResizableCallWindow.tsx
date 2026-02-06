import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripHorizontal, Minimize2, Maximize2, X, ExternalLink, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useElectronCallWindow } from '@/hooks/useElectronCallWindow';

interface ResizableCallWindowProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  className?: string;
  roomName?: string;
  participantName?: string;
  isVideo?: boolean;
  isHost?: boolean;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type PiPMode = 'mini' | 'small' | 'medium' | 'full';

export const ResizableCallWindow = ({
  children,
  onClose,
  title = 'Call',
  minWidth = 280,
  minHeight = 200,
  maxWidth = 1200,
  maxHeight = 900,
  defaultWidth = 640,
  defaultHeight = 480,
  className,
  roomName,
  participantName,
  isVideo = true,
  isHost = false,
}: ResizableCallWindowProps) => {
  const { isElectron, isPoppedOut, popOutCall, popInCall } = useElectronCallWindow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [pipMode, setPipMode] = useState<PiPMode>('medium');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const sizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const resizeStartRef = useRef({ clientX: 0, clientY: 0 });

  // Determine PiP mode based on size
  const calculatePipMode = useCallback((width: number, height: number): PiPMode => {
    const area = width * height;
    if (area < 120000) return 'mini';     // < ~340x350
    if (area < 200000) return 'small';    // < ~450x450
    if (area < 400000) return 'medium';   // < ~630x630
    return 'full';
  }, []);

  // Center on mount
  useEffect(() => {
    if (!isInitialized) {
      const isMobile = window.innerWidth < 768;
      const w = isMobile ? window.innerWidth - 16 : Math.min(defaultWidth, window.innerWidth - 32);
      const h = isMobile ? window.innerHeight - 100 : Math.min(defaultHeight, window.innerHeight - 100);
      const x = (window.innerWidth - w) / 2;
      const y = isMobile ? 50 : (window.innerHeight - h) / 2;
      
      setSize({ width: w, height: h });
      setPosition({ x: Math.max(8, x), y: Math.max(20, y) });
      setPipMode(calculatePipMode(w, h));
      setIsInitialized(true);
    }
  }, [isInitialized, defaultWidth, defaultHeight, calculatePipMode]);

  // Handle dragging
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    positionRef.current = position;
  };

  // Handle resize start
  const handleResizeStart = (handle: ResizeHandle) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setIsResizing(true);
    setResizeHandle(handle);
    sizeStartRef.current = { ...size, ...position };
    resizeStartRef.current = { clientX, clientY };
  };

  // Mouse/touch move handler
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;
        
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, positionRef.current.x + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - 60, positionRef.current.y + deltaY));
        
        setPosition({ x: newX, y: newY });
      }

      if (isResizing && resizeHandle) {
        const deltaX = clientX - resizeStartRef.current.clientX;
        const deltaY = clientY - resizeStartRef.current.clientY;
        
        let newWidth = sizeStartRef.current.width;
        let newHeight = sizeStartRef.current.height;
        let newX = sizeStartRef.current.x;
        let newY = sizeStartRef.current.y;

        // Handle different resize directions
        if (resizeHandle.includes('e')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, sizeStartRef.current.width + deltaX));
        }
        if (resizeHandle.includes('w')) {
          const widthDelta = Math.max(minWidth, Math.min(maxWidth, sizeStartRef.current.width - deltaX)) - sizeStartRef.current.width;
          newWidth = sizeStartRef.current.width + widthDelta;
          newX = sizeStartRef.current.x - widthDelta;
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, sizeStartRef.current.height + deltaY));
        }
        if (resizeHandle.includes('n')) {
          const heightDelta = Math.max(minHeight, Math.min(maxHeight, sizeStartRef.current.height - deltaY)) - sizeStartRef.current.height;
          newHeight = sizeStartRef.current.height + heightDelta;
          newY = sizeStartRef.current.y - heightDelta;
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
        setPipMode(calculatePipMode(newWidth, newHeight));
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, resizeHandle, size.width, minWidth, minHeight, maxWidth, maxHeight, calculatePipMode]);

  // Toggle minimize
  const toggleMinimize = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsMinimized(true);
    }
  };

  // Maximize to near full screen
  const handleMaximize = () => {
    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 8 : 32;
    setSize({
      width: Math.min(maxWidth, window.innerWidth - padding * 2),
      height: Math.min(maxHeight, window.innerHeight - 80),
    });
    setPosition({ x: padding, y: 40 });
    setPipMode('full');
  };

  // Cursor style based on resize handle
  const getCursorStyle = (handle: ResizeHandle) => {
    const cursors: Record<ResizeHandle, string> = {
      n: 'cursor-ns-resize',
      s: 'cursor-ns-resize',
      e: 'cursor-ew-resize',
      w: 'cursor-ew-resize',
      ne: 'cursor-nesw-resize',
      nw: 'cursor-nwse-resize',
      se: 'cursor-nwse-resize',
      sw: 'cursor-nesw-resize',
    };
    return cursors[handle];
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          width: isMinimized ? 280 : size.width,
          height: isMinimized ? 60 : size.height,
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          "fixed z-[9999] overflow-hidden",
          "bg-background/95 backdrop-blur-xl",
          "border border-border/50 rounded-2xl",
          "shadow-2xl shadow-black/30",
          isDragging && "cursor-grabbing select-none",
          isResizing && "select-none",
          className
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Glassmorphism header */}
        <div
          className={cn(
            "flex items-center justify-between px-3 h-10",
            "bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-sm",
            "border-b border-border/30",
            "cursor-grab active:cursor-grabbing"
          )}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
              {title}
            </span>
            {pipMode !== 'full' && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {pipMode}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Pop-out button - only show in Electron when not already popped out */}
            {isElectron && !isPoppedOut && roomName && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/20"
                onClick={() => popOutCall({
                  roomName,
                  participantName: participantName || 'User',
                  conversationName: title,
                  isVideo,
                  isHost,
                })}
                title="Pop out to separate window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            {/* Pop-in button - only show in Electron when popped out */}
            {isElectron && isPoppedOut && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/20"
                onClick={popInCall}
                title="Pop back into app"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-muted/80"
              onClick={toggleMinimize}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-muted/80"
              onClick={handleMaximize}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive/20 text-destructive"
              onClick={onClose}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        {!isMinimized && (
          <div className="h-[calc(100%-40px)] overflow-hidden">
            {React.cloneElement(children as React.ReactElement, { pipMode })}
          </div>
        )}

        {/* Invisible resize handles - like Windows windows */}
        {!isMinimized && (
          <>
            {/* Corner handles - invisible but functional */}
            {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => (
              <div
                key={handle}
                className={cn(
                  "absolute w-3 h-3 z-10 hidden md:block",
                  getCursorStyle(handle),
                  handle === 'nw' && "top-0 left-0",
                  handle === 'ne' && "top-0 right-0",
                  handle === 'sw' && "bottom-0 left-0",
                  handle === 'se' && "bottom-0 right-0"
                )}
                onMouseDown={handleResizeStart(handle)}
                onTouchStart={handleResizeStart(handle)}
              />
            ))}

            {/* Edge handles - invisible but functional */}
            <div
              className="absolute top-0 left-3 right-3 h-1 cursor-ns-resize hidden md:block"
              onMouseDown={handleResizeStart('n')}
              onTouchStart={handleResizeStart('n')}
            />
            <div
              className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize hidden md:block"
              onMouseDown={handleResizeStart('s')}
              onTouchStart={handleResizeStart('s')}
            />
            <div
              className="absolute left-0 top-10 bottom-3 w-1 cursor-ew-resize hidden md:block"
              onMouseDown={handleResizeStart('w')}
              onTouchStart={handleResizeStart('w')}
            />
            <div
              className="absolute right-0 top-10 bottom-3 w-1 cursor-ew-resize hidden md:block"
              onMouseDown={handleResizeStart('e')}
              onTouchStart={handleResizeStart('e')}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
