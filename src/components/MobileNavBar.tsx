import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { triggerHaptic } from "@/utils/haptics";
import { 
  Home, 
  MessageSquare, 
  Users, 
  Video, 
  FolderOpen, 
  Sparkles, 
  Settings,
  Crown,
  Shield,
  MoreHorizontal
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
          "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all touch-manipulation",
          "active:scale-95",
          isActive
            ? "text-primary"
            : "text-muted-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
          <span className="text-[10px] font-medium">{label}</span>
          {isActive && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-1 w-8 h-1 bg-primary rounded-full"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
};

export const MobileNavBar = () => {
  const { isOwner } = useUserRole();
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();

  // Close "More" menu when route changes to prevent frozen UI
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  // Primary nav items (shown in bottom bar)
  const primaryItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: Users, label: "Teams", path: "/teams" },
    { icon: Video, label: "Meet", path: "/meetings" },
  ];

  // Secondary items (shown in "More" menu)
  const secondaryItems = [
    { icon: FolderOpen, label: "Files", path: "/files" },
    { icon: Sparkles, label: "AI", path: "/ai" },
    { icon: Crown, label: "Plans", path: "/subscription" },
    ...(isOwner ? [{ icon: Shield, label: "Admin", path: "/admin" }] : []),
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const handleMoreClick = () => {
    triggerHaptic('selection');
    setShowMore(!showMore);
  };

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
              className="fixed inset-0 bg-black/50 z-40 touch-none"
              onClick={() => setShowMore(false)}
              onTouchEnd={() => setShowMore(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-20 left-4 right-4 bg-card border border-border rounded-2xl p-4 z-50 shadow-2xl safe-area-pb"
            >
              <div className="grid grid-cols-4 gap-4">
                {secondaryItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      triggerHaptic('light');
                      setShowMore(false);
                    }}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors touch-manipulation",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent"
                      )
                    }
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-center justify-around px-2 py-1">
          {primaryItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          <button
            onClick={handleMoreClick}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all touch-manipulation",
              "active:scale-95",
              showMore ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
