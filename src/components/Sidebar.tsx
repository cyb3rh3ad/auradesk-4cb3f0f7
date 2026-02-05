import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";
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
} from "@/components/icons/FuturisticIcons";

// SVG cutout "A" logo - pure vector, background shows through
const CutoutLogo = ({ size = 32 }: { size?: number }) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' }}
  >
    <defs>
      <linearGradient id="sidebarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(262, 83%, 58%)" />
        <stop offset="50%" stopColor="hsl(280, 80%, 60%)" />
        <stop offset="100%" stopColor="hsl(217, 91%, 60%)" />
      </linearGradient>
      <filter id="sidebarGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#sidebarGlow)">
      <path
        d="M50 10 L85 90 L73 90 L63 68 L37 68 L27 90 L15 90 L50 10 Z M50 28 L38 60 L62 60 L50 28 Z"
        fill="none"
        stroke="url(#sidebarGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

// Logo wrapper with subtle ambient glow
const AuraLogo = ({ size = "md" }: { size?: "sm" | "md" }) => (
  <div className="relative">
    <div 
      className="absolute inset-0 rounded-full blur-xl opacity-40"
      style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
        transform: 'scale(1.5)',
      }}
    />
    <CutoutLogo size={size === "md" ? 44 : 36} />
  </div>
);

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
  }) => cn("w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300", "hover:bg-sidebar-accent group relative", "hover:scale-105 hover:shadow-lg hover:shadow-primary/10", isActive && "bg-sidebar-accent text-sidebar-primary shadow-md shadow-primary/20")} style={{
    animationDelay: animationDelay ? `${animationDelay}ms` : undefined
  }}>
      {({
      isActive
    }) => <>
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={cn("transition-colors duration-300", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70")} isActive={isActive} isHovered={isHovered} />
          </div>
          <span className="absolute left-full ml-4 px-4 py-2 bg-sidebar-accent/95 backdrop-blur-sm text-sidebar-foreground text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-sidebar-border/50">
            {label}
          </span>
          {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl -z-10" />}
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
        <AuraLogo size="md" />
      </div>
      
      <nav className="relative flex-1 flex flex-col items-center space-y-2 w-full px-3">
        {navItems.map((item, index) => <SidebarNavItem key={item.path} icon={item.icon} label={item.label} path={item.path} variant="desktop" animationDelay={index * 50} />)}
      </nav>
      
      <div className="relative w-10 h-0.5 bg-gradient-to-r from-transparent via-sidebar-border to-transparent rounded-full" />
    </aside>;
};