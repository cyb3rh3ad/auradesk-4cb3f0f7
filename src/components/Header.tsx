import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const Header = () => {
  const { user, signOut } = useAuth();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Desktop: Update menu position when opened
  useEffect(() => {
    if (!isMobile && profileMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 256;
      const padding = 16;
      const viewportWidth = window.innerWidth;
      
      let rightPos = viewportWidth - rect.right;
      if (rect.right - menuWidth < padding) {
        rightPos = viewportWidth - menuWidth - padding;
      }
      rightPos = Math.max(rightPos, padding);
      
      setMenuPosition({
        top: rect.bottom + 8,
        right: rightPos
      });
    }
  }, [profileMenuOpen, isMobile]);

  // Desktop: Close menu when clicking outside
  useEffect(() => {
    if (isMobile) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        profileMenuRef.current && 
        !profileMenuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen, isMobile]);

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setProfileMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setProfileMenuOpen(false);
  };

  const ProfileMenuContent = () => (
    <>
      {/* User info header */}
      <div className="p-4 bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 ring-2 ring-background shadow-lg">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-semibold">
              {user?.email ? getInitials(user.email) : "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {user?.user_metadata?.full_name || "My Account"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
      
      {/* Menu items */}
      <div className="p-2">
        <button
          onClick={() => handleMenuItemClick('/settings')}
          className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl hover:bg-muted/80 active:bg-muted transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="text-base">Settings</span>
        </button>
        <button
          onClick={() => handleMenuItemClick('/subscription')}
          className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl hover:bg-muted/80 active:bg-muted transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <User className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="text-base">Subscription</span>
        </button>
      </div>
      
      {/* Sign out footer */}
      <div className="p-2 border-t border-border/50">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl hover:bg-destructive/10 active:bg-destructive/20 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <span className="text-base text-destructive">Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <header className="h-16 border-b border-border/50 bg-background flex items-center justify-between px-4 md:px-6 relative z-[100]">
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

      <div className={cn("flex items-center gap-1 relative z-10", isMobile && "ml-auto")}>
        {/* Mobile: Icon-only help button */}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHelpDialogOpen(true)}
            className="w-10 h-10 rounded-xl hover:bg-accent/10 transition-all duration-200"
          >
            <AnimatedHeadphonesIcon className="h-5 w-5" />
          </Button>
        ) : (
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

        <div className={cn(isMobile ? "mx-1" : "mx-2")}>
          <NotificationsDropdown />
        </div>

        {/* Profile Menu Trigger */}
        <div className="relative ml-4">
          <button 
            ref={buttonRef}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="rounded-full transition-all duration-200 hover:ring-2 hover:ring-muted-foreground/30 focus:outline-none"
          >
            <Avatar className="w-9 h-9 ring-2 ring-border">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-medium">
                {user?.email ? getInitials(user.email) : "AD"}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* Mobile: Bottom Sheet Drawer */}
          {isMobile && (
            <Drawer open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <DrawerContent>
                <DrawerHeader className="sr-only">
                  <DrawerTitle>Account Menu</DrawerTitle>
                </DrawerHeader>
                <ProfileMenuContent />
              </DrawerContent>
            </Drawer>
          )}

          {/* Desktop: Positioned Dropdown */}
          {!isMobile && profileMenuOpen && createPortal(
            <div ref={profileMenuRef}>
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="fixed bg-popover border border-border/50 shadow-2xl rounded-2xl overflow-hidden"
                  style={{ 
                    transformOrigin: "top right",
                    top: menuPosition.top,
                    right: menuPosition.right,
                    width: '256px',
                    zIndex: 99999
                  }}
                >
                  <ProfileMenuContent />
                </motion.div>
              </AnimatePresence>
            </div>,
            document.body
          )}
        </div>
      </div>

      <HelpRequestDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </header>
  );
};
