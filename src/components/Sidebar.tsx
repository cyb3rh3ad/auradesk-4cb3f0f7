import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import auradeskLogo from "@/assets/auradesk-logo.png";
import {
  AnimatedHomeIcon,
  AnimatedChatIcon,
  AnimatedTeamsIcon,
  AnimatedVideoIcon,
  AnimatedFilesIcon,
  AnimatedAIIcon,
  AnimatedCrownIcon,
  AnimatedShieldIcon,
  AnimatedSettingsIcon,
} from "@/components/icons/AnimatedIcons";

// Enhanced image-based logo with glow effect
const AuraLogo = ({ size = "md" }: { size?: "sm" | "md" }) => (
  <div className={cn(
    "relative flex items-center justify-center rounded-2xl overflow-hidden",
    "bg-gradient-to-br from-background via-background/90 to-muted",
    "shadow-lg ring-1 ring-primary/20",
    "before:absolute before:inset-0 before:bg-gradient-to-t before:from-primary/10 before:via-transparent before:to-transparent",
    "after:absolute after:-inset-1 after:bg-gradient-to-br after:from-primary/30 after:to-accent/30 after:blur-xl after:opacity-50 after:-z-10",
    size === "md" ? "w-14 h-14" : "w-11 h-11"
  )}>
    <img 
      src={auradeskLogo} 
      alt="AuraDesk" 
      className={cn(
        "relative z-10 object-contain",
        size === "md" ? "w-10 h-10" : "w-8 h-8"
      )}
    />
  </div>
);

export const Sidebar = () => {
  const isMobile = useIsMobile();
  const { isOwner } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { icon: AnimatedHomeIcon, label: "Dashboard", path: "/dashboard" },
    { icon: AnimatedChatIcon, label: "Chat", path: "/chat" },
    { icon: AnimatedTeamsIcon, label: "Teams", path: "/teams" },
    { icon: AnimatedVideoIcon, label: "Meetings", path: "/meetings" },
    { icon: AnimatedFilesIcon, label: "Files", path: "/files" },
    { icon: AnimatedAIIcon, label: "AI Assistant", path: "/ai" },
    { icon: AnimatedCrownIcon, label: "Subscription", path: "/subscription" },
    ...(isOwner ? [{ icon: AnimatedShieldIcon, label: "Admin", path: "/admin" }] : []),
    { icon: AnimatedSettingsIcon, label: "Settings", path: "/settings" },
  ];

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm hover:bg-accent"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>

        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-40 transition-transform duration-300 md:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full py-6 px-4 space-y-8">
            <div className="flex items-center gap-3 px-2">
              <AuraLogo size="sm" />
              <span className="text-lg font-bold">AuraDesk</span>
            </div>

            <nav className="flex-1 flex flex-col space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      "hover:bg-sidebar-accent",
                      isActive && "bg-sidebar-accent text-sidebar-primary"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon 
                        className={cn(
                          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"
                        )} 
                        isActive={isActive}
                      />
                      <span className="font-medium">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>
      </>
    );
  }

  return (
    <aside className="w-20 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 space-y-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative group hover:scale-105 transition-transform duration-300">
        <AuraLogo size="md" />
      </div>
      
      <nav className="relative flex-1 flex flex-col items-center space-y-2 w-full px-3">
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "w-full h-12 flex items-center justify-center rounded-xl transition-all duration-300",
                "hover:bg-sidebar-accent group relative",
                "hover:scale-105 hover:shadow-lg hover:shadow-primary/10",
                isActive && "bg-sidebar-accent text-sidebar-primary shadow-md shadow-primary/20"
              )
            }
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={cn(
                    "transition-all duration-300",
                    isActive ? "text-sidebar-primary scale-110" : "text-sidebar-foreground/70"
                  )} 
                  isActive={isActive}
                />
                <span className="absolute left-full ml-4 px-4 py-2 bg-sidebar-accent/95 backdrop-blur-sm text-sidebar-foreground text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-sidebar-border/50">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl -z-10" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      <div className="relative w-10 h-0.5 bg-gradient-to-r from-transparent via-sidebar-border to-transparent rounded-full" />
    </aside>
  );
};
