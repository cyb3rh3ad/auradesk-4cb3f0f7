import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/utils/haptics';

const QUICK_EMOJIS = ['❤️', '😂', '😮', '👍', '😢', '🔥'];

interface MessageReactionMenuProps {
  messageId: string;
  messageContent: string;
  senderId: string;
  isOwn: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (messageId: string, content: string, senderName: string) => void;
  onCopy: (content: string) => void;
  senderName: string;
  children: React.ReactNode;
}

export const MessageReactionMenu = ({
  messageId,
  messageContent,
  senderId,
  isOwn,
  onReact,
  onReply,
  onCopy,
  senderName,
  children,
}: MessageReactionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLongPressStart = useCallback((clientX: number, clientY: number) => {
    touchStartPos.current = { x: clientX, y: clientY };
    longPressTimer.current = setTimeout(() => {
      triggerHaptic('medium');
      setIsOpen(true);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      handleLongPressEnd();
    }
  }, [handleLongPressEnd]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleReact = (emoji: string) => {
    onReact(messageId, emoji);
    setIsOpen(false);
  };

  const handleReply = () => {
    onReply(messageId, messageContent, senderName);
    setIsOpen(false);
  };

  const handleCopy = () => {
    onCopy(messageContent);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={(e) => handleLongPressStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleLongPressEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => {
        e.preventDefault();
        triggerHaptic('medium');
        setIsOpen(true);
      }}
    >
      {children}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'absolute z-50 flex flex-col gap-1',
                isOwn ? 'right-0' : 'left-0',
                'bottom-full mb-2'
              )}
            >
              {/* Emoji row */}
              <div className="flex items-center gap-1 bg-card/95 backdrop-blur-xl rounded-full px-2 py-1.5 shadow-xl border border-border/50">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="w-9 h-9 flex items-center justify-center text-lg rounded-full hover:bg-muted/60 active:scale-90 transition-all touch-manipulation"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="bg-card/95 backdrop-blur-xl rounded-xl shadow-xl border border-border/50 overflow-hidden min-w-[180px]">
                <button
                  onClick={handleReply}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
                >
                  <Reply className="w-4 h-4 text-muted-foreground" />
                  <span>Reply</span>
                </button>
                <div className="h-px bg-border/30 mx-2" />
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  <span>Copy</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
