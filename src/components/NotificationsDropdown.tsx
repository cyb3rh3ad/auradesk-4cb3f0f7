import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { triggerHaptic } from '@/utils/haptics';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const NotificationsDropdown = () => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Welcome to AuraDesk',
      message: 'Get started by exploring the dashboard',
      time: '5 min ago',
      read: false,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const removeNotification = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    triggerHaptic('medium');
    setNotifications([]);
    setOpen(false);
  }, []);

  // Update position when opening with viewport-aware positioning
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 320; // max menu width
      const padding = 16;
      
      // Calculate right position, ensuring menu stays within viewport
      let rightPos = window.innerWidth - rect.right;
      
      // If menu would overflow left side, adjust
      if (rect.right - menuWidth < padding) {
        rightPos = window.innerWidth - menuWidth - padding;
      }
      
      // Ensure minimum padding from right edge
      rightPos = Math.max(rightPos, padding);
      
      // Calculate top position
      let topPos = rect.bottom + 8;
      
      // If menu would overflow bottom, position above the button instead
      const estimatedMenuHeight = 300;
      if (topPos + estimatedMenuHeight > window.innerHeight - padding) {
        topPos = Math.max(rect.top - estimatedMenuHeight - 8, padding);
      }
      
      setMenuPosition({
        top: topPos,
        right: rightPos,
      });
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleToggle = () => {
    triggerHaptic('selection');
    setOpen(!open);
  };

  return (
    <div className="relative">
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="icon" 
        className="relative touch-manipulation"
        onClick={handleToggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
              style={{
                position: 'fixed',
                top: menuPosition.top,
                right: menuPosition.right,
                zIndex: 99999,
                maxWidth: 'calc(100vw - 32px)',
              }}
              className="w-80 rounded-xl border border-border bg-background shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-foreground">Notifications</span>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                      onClick={clearAll}
                    >
                      Clear all
                    </Button>
                  )}
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="py-1 max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No notifications</p>
                    <p className="text-xs mt-1 opacity-70">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="relative group"
                    >
                      <button
                        className="w-full flex flex-col items-start gap-1 p-3 pr-10 hover:bg-accent/30 transition-colors text-left"
                        onClick={() => {
                          markAsRead(notification.id);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="font-medium text-foreground">{notification.title}</span>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                        <span className="text-xs text-muted-foreground/60">{notification.time}</span>
                      </button>
                      
                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 opacity-100 md:opacity-0 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => removeNotification(notification.id, e)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
