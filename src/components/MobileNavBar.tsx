import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { triggerHaptic } from "@/utils/haptics";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKeyboardVisibility } from "@/hooks/useKeyboardVisibility";
import {
  HomeIcon,
  ChatIcon,
  TeamsIcon,
  VideoIcon,
  FilesIcon,
  AIIcon,
  CrownIcon,
  ShieldIcon,
  SettingsIcon,
  MoreIcon,
} from "@/components/icons/CosmicIcons";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  onClick?: () => void;
}

const NavItem = ({ icon: Icon, label, path, onClick }: NavItemProps) => {
  const handleClick = () => {
    triggerHaptic('light');
    onClick?.();
  };

  return (
    <NavLink
      to={path}
      onClick={handleClick}
      className={({ isActive }) =>
        cn(
          "relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-300 touch-manipulation min-w-[56px]",
          "active:scale-90 active:opacity-70",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active background glow */}
          {isActive && (
            <motion.div
              layoutId="navActiveBackground"
              className="absolute inset-0 bg-primary/10 rounded-xl"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <motion.div
            animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Icon 
              size="md"
              isActive={isActive} 
              isHovered={false}
              className={cn(
                "transition-colors duration-200",
                isActive && "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
              )} 
            />
          </motion.div>
          <span className={cn(
            "text-[10px] font-semibold tracking-wide transition-all duration-200",
            isActive && "text-primary"
          )}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};

export const MobileNavBar = () => {
  const { isOwner } = useUserRole();
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();
  const isKeyboardOpen = useKeyboardVisibility();

  // Close more menu on route change
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  // Primary nav items (shown in bottom bar)
  const primaryItems = [
    { icon: HomeIcon, label: "Home", path: "/dashboard" },
    { icon: ChatIcon, label: "Chat", path: "/chat" },
    { icon: TeamsIcon, label: "Teams", path: "/teams" },
    { icon: VideoIcon, label: "Meet", path: "/meetings" },
  ];

  // Secondary items (shown in "More" menu)
  const secondaryItems = [
    { icon: FilesIcon, label: "Files", path: "/files" },
    { icon: AIIcon, label: "AI", path: "/ai" },
    { icon: CrownIcon, label: "Plans", path: "/subscription" },
    ...(isOwner ? [{ icon: ShieldIcon, label: "Admin", path: "/admin" }] : []),
    { icon: SettingsIcon, label: "Settings", path: "/settings" },
  ];

  const handleMoreClick = () => {
    triggerHaptic('selection');
    setShowMore(!showMore);
  };

  // Hide nav bar entirely when keyboard is open
  if (isKeyboardOpen) return null;

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-24 left-4 right-4 bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-5 z-50 shadow-2xl shadow-black/20"
            >
              {/* Handle bar */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-muted-foreground/30 rounded-full" />
              
              <div className="grid grid-cols-4 gap-3 mt-2">
                {secondaryItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        triggerHaptic('light');
                        setShowMore(false);
                      }}
                      className={({ isActive }) =>
                        cn(
                          "flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200 touch-manipulation",
                          "active:scale-90",
                          isActive
                            ? "bg-primary/15 text-primary shadow-lg shadow-primary/10"
                            : "text-muted-foreground hover:bg-accent/50 active:bg-accent"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Icon size="md" isActive={isActive} isHovered={false} />
                          </motion.div>
                          <span className="text-xs font-semibold">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar - part of flex flow, not fixed */}
      <nav 
        className="flex-shrink-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/30 relative" 
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Gradient glow effect */}
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="flex items-center justify-around px-2 py-2.5">
          {primaryItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          <motion.button
            onClick={handleMoreClick}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-300 touch-manipulation min-w-[56px]",
              showMore 
                ? "text-primary" 
                : "text-muted-foreground"
            )}
          >
            {showMore && (
              <motion.div
                layoutId="navActiveBackground"
                className="absolute inset-0 bg-primary/10 rounded-xl"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <motion.div
              animate={showMore ? { rotate: 90 } : { rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <MoreIcon 
                size="md"
                isActive={showMore}
                isHovered={false}
                className={cn(
                  "transition-colors duration-200",
                  showMore && "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                )} 
              />
            </motion.div>
            <span className={cn(
              "text-[10px] font-semibold tracking-wide transition-all duration-200",
              showMore && "text-primary"
            )}>
              More
            </span>
          </motion.button>
        </div>
      </nav>
    </>
  );
};
