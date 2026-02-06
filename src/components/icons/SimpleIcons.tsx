import { 
  Home, 
  MessageSquare, 
  Users, 
  Video, 
  FolderOpen, 
  Sparkles, 
  Crown, 
  Shield, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  isActive?: boolean;
  isHovered?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-7 h-7",
};

// Simple Home Icon
export const SimpleHomeIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <Home 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple Chat Icon
export const SimpleChatIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <MessageSquare 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple Teams Icon
export const SimpleTeamsIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <Users 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple Video Icon
export const SimpleVideoIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <Video 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple Files Icon
export const SimpleFilesIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <FolderOpen 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple AI Icon
export const SimpleAIIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <Sparkles 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple Crown Icon
export const SimpleCrownIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <Crown 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple Shield Icon
export const SimpleShieldIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <Shield 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Simple Settings Icon
export const SimpleSettingsIcon = ({ className, isActive, isHovered, size = "md" }: IconProps) => (
  <Settings 
    className={cn(
      sizeMap[size], 
      "transition-all duration-200",
      (isActive || isHovered) && "text-primary",
      className
    )} 
  />
);

// Export with matching names
export {
  SimpleHomeIcon as HomeIcon,
  SimpleChatIcon as ChatIcon,
  SimpleTeamsIcon as TeamsIcon,
  SimpleVideoIcon as VideoIcon,
  SimpleFilesIcon as FilesIcon,
  SimpleAIIcon as AIIcon,
  SimpleCrownIcon as CrownIcon,
  SimpleShieldIcon as ShieldIcon,
  SimpleSettingsIcon as SettingsIcon,
};
