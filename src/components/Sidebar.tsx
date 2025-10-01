import { Home, MessageSquare, Users, Video, Settings, FileText, Bot } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Users, label: "Teams", path: "/teams" },
  { icon: Video, label: "Meetings", path: "/meetings" },
  { icon: FileText, label: "Files", path: "/files" },
  { icon: Bot, label: "AI Assistant", path: "/ai" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const Sidebar = () => {
  return (
    <aside className="w-20 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 space-y-8">
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary">
        <span className="text-xl font-bold text-primary-foreground">AD</span>
      </div>
      
      <nav className="flex-1 flex flex-col items-center space-y-4 w-full px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "w-full h-12 flex items-center justify-center rounded-xl transition-all duration-200",
                "hover:bg-sidebar-accent group relative",
                isActive && "bg-sidebar-accent text-sidebar-primary"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"
                )} />
                <span className="absolute left-full ml-3 px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
