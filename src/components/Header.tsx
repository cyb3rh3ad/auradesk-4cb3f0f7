import { useState, useRef, useEffect } from "react";
import { Command, LogOut, Settings, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HelpRequestDialog } from "./HelpRequestDialog";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { AnimatedSearchIcon, AnimatedHeadphonesIcon } from "@/components/icons/AnimatedIcons";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const { user, signOut } = useAuth();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setProfileMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setProfileMenuOpen(false);
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background flex items-center justify-between px-4 md:px-6 relative z-50">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {!isMobile && (
        <div className="flex items-center flex-1 max-w-2xl relative z-10">
          <div className="relative w-full group">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <AnimatedSearchIcon className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Command className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Search messages, files, or people..."
              className="pl-11 pr-11 bg-muted/30 border border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 rounded-xl h-11 transition-all duration-200 focus-visible:shadow-lg focus-visible:shadow-primary/10"
            />
          </div>
        </div>
      )}

      <div className={cn("flex items-center relative z-10", isMobile && "ml-auto")}>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHelpDialogOpen(true)}
            className="gap-2 hover:bg-accent/10 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <AnimatedHeadphonesIcon className="h-4 w-4" />
            Request Help
          </Button>
        )}

        <div className="mx-2">
          <NotificationsDropdown />
        </div>

        {/* Profile Menu - Custom positioned */}
        <div ref={profileMenuRef} className="relative ml-4">
          <button 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="focus:outline-none rounded-full"
          >
            <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/30 transition-all">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                {user?.email ? getInitials(user.email) : "AD"}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* Custom dropdown menu */}
          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border shadow-xl rounded-xl py-1 z-[300]">
              <div className="px-3 py-2">
                <p className="font-medium text-sm">My Account</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => handleMenuItemClick('/settings')}
                className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => handleMenuItemClick('/subscription')}
                className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              >
                <User className="mr-2 h-4 w-4" />
                Subscription
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <HelpRequestDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </header>
  );
};
