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
import { useState, useEffect, memo, useCallback } from "react";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  onClick?: () => void;
}

// NavItem with subtle animations
const NavItem = memo(({ icon: Icon, label, path, onClick }: NavItemProps) => {
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
          "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl touch-manipulation relative group",
          "transition-all duration-200 ease-out",
          "active:scale-90",
          isActive 
            ? "text-primary" 
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={cn(
            "transition-transform duration-200 ease-out",
            isActive && "animate-bounce-subtle"
          )}>
            <Icon className={cn(
              "w-5 h-5 transition-all duration-200",
              isActive && "text-primary drop-shadow-sm"
            )} />
          </div>
          <span className={cn(
            "text-[10px] font-medium transition-all duration-200",
            isActive && "font-semibold"
          )}>{label}</span>
          <div className={cn(
            "absolute bottom-1 h-1 bg-primary rounded-full transition-all duration-200 ease-out",
            isActive 
              ? "w-8 opacity-100 animate-indicator-slide" 
              : "w-0 opacity-0"
          )} />
        </>
      )}
    </NavLink>
  );
});
NavItem.displayName = 'NavItem';

// Primary nav items - defined outside component to prevent recreation
const primaryItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Users, label: "Teams", path: "/teams" },
  { icon: Video, label: "Meet", path: "/meetings" },
];

export const MobileNavBar = memo(() => {
  const { isOwner } = useUserRole();
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();

  // Close "More" menu when route changes to prevent frozen UI
  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  // Secondary items - memoized since it depends on isOwner
  const secondaryItems = [
    { icon: FolderOpen, label: "Files", path: "/files" },
    { icon: Sparkles, label: "AI", path: "/ai" },
    { icon: Crown, label: "Plans", path: "/subscription" },
    ...(isOwner ? [{ icon: Shield, label: "Admin", path: "/admin" }] : []),
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const handleMoreClick = useCallback(() => {
    triggerHaptic('selection');
    setShowMore(prev => !prev);
  }, []);

  const closeMore = useCallback(() => {
    setShowMore(false);
  }, []);

  const handleSecondaryClick = useCallback(() => {
    triggerHaptic('light');
    setShowMore(false);
  }, []);

  return (
    <>
      {/* More menu overlay with smooth animations */}
      {showMore && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 touch-none animate-fade-in"
            onClick={closeMore}
            onTouchEnd={closeMore}
          />
          <div className="fixed bottom-20 left-4 right-4 bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 z-50 shadow-2xl safe-area-pb animate-slide-up">
            <div className="grid grid-cols-4 gap-3">
              {secondaryItems.map((item, index) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleSecondaryClick}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl touch-manipulation animate-fade-in-up",
                      "transition-all duration-200 ease-out",
                      "active:scale-90",
                      isActive
                        ? "bg-primary/15 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/50 safe-area-pb shadow-lg">
        <div className="flex items-center justify-around px-2 py-1">
          {primaryItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
          <button
            onClick={handleMoreClick}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl touch-manipulation relative group",
              "transition-all duration-200 ease-out",
              "active:scale-90",
              showMore ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "transition-transform duration-200 ease-out",
              showMore && "rotate-90"
            )}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
});
MobileNavBar.displayName = 'MobileNavBar';
