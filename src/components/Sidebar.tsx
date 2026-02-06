import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";
import { AuroraLogo } from "@/components/icons/AuroraLogo";
import { AuraBubbleIcon } from "@/components/icons/AuraBubbleIcon";
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
} from "@/components/icons/CosmicIcons";

// Separate component for nav items to properly use hooks
interface NavItemProps {
  icon: React.ComponentType<{
    className?: string;
    isActive?: boolean;
    isHovered?: boolean;
  }>;
  label: string;
  path: string;
  onClick?: () => void;
  variant: "mobile" | "desktop";
  animationDelay?: number;
}
const SidebarNavItem = ({
  icon: Icon,
  label,
  path,
  onClick,
  variant,
  animationDelay
}: NavItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  if (variant === "mobile") {
    return <NavLink to={path} onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={({
      isActive
    }) => cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all", "hover:bg-sidebar-accent", isActive && "bg-sidebar-accent text-sidebar-primary")}>
        {({
        isActive
      }) => <>
            <Icon className={cn(isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70")} isActive={isActive} isHovered={isHovered} />
            <span className="font-medium">{label}</span>
          </>}
      </NavLink>;
  }
  return <NavLink to={path} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={({
    isActive
  }) => cn("w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300", "group relative")} style={{
    animationDelay: animationDelay ? `${animationDelay}ms` : undefined
  }}>
      {({
      isActive
    }) => <>
          <AuraBubbleIcon size={48} isHovered={isHovered} isActive={isActive}>
            <Icon className={cn("transition-colors duration-300", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70")} isActive={isActive} isHovered={isHovered} />
          </AuraBubbleIcon>
          <span className="absolute left-full ml-4 px-4 py-2 bg-sidebar-accent/95 backdrop-blur-sm text-sidebar-foreground text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-sidebar-border/50">
            {label}
          </span>
        </>}
    </NavLink>;
};
export const Sidebar = () => {
  const isMobile = useIsMobile();
  const {
    isOwner
  } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const navItems = [{
    icon: HomeIcon,
    label: "Dashboard",
    path: "/dashboard"
  }, {
    icon: ChatIcon,
    label: "Chat",
    path: "/chat"
  }, {
    icon: TeamsIcon,
    label: "Teams",
    path: "/teams"
  }, {
    icon: VideoIcon,
    label: "Meetings",
    path: "/meetings"
  }, {
    icon: FilesIcon,
    label: "Files",
    path: "/files"
  }, {
    icon: AIIcon,
    label: "AI Assistant",
    path: "/ai"
  }, {
    icon: CrownIcon,
    label: "Subscription",
    path: "/subscription"
  }, ...(isOwner ? [{
    icon: ShieldIcon,
    label: "Admin",
    path: "/admin"
  }] : []), {
    icon: SettingsIcon,
    label: "Settings",
    path: "/settings"
  }];
  // Mobile view is now handled by MobileNavBar, so we return null on mobile
  if (isMobile) {
    return null;
  }
  
  return <aside className="w-20 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 space-y-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative group hover:scale-105 transition-transform duration-300">
        <AuroraLogo size={48} animated={false} />
      </div>
      
      <nav className="relative flex-1 flex flex-col items-center space-y-2 w-full px-3">
        {navItems.map((item, index) => <SidebarNavItem key={item.path} icon={item.icon} label={item.label} path={item.path} variant="desktop" animationDelay={index * 50} />)}
      </nav>
      
      <div className="relative w-10 h-0.5 bg-gradient-to-r from-transparent via-sidebar-border to-transparent rounded-full" />
    </aside>;
};