import { useState, useRef, useEffect } from "react";
import { Command, LogOut, Settings, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setProfileOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setProfileOpen(false);
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background flex items-center justify-between px-4 md:px-6 relative">
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

      <div className={cn("flex items-center space-x-2 relative z-10", isMobile && "ml-auto")}>
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

        <NotificationsDropdown />

        {/* Expanding Profile Menu */}
        <div ref={profileRef} className="relative">
          <motion.div
            layout
            className={cn(
              "overflow-hidden rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm",
              profileOpen && "shadow-xl shadow-primary/10"
            )}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
          >
            {/* Avatar Trigger */}
            <motion.button
              layout
              onClick={() => setProfileOpen(!profileOpen)}
              className="p-1.5 hover:bg-accent/30 transition-colors"
            >
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                  {user?.email ? getInitials(user.email) : "AD"}
                </AvatarFallback>
              </Avatar>
            </motion.button>

            {/* Expanded Content */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/50 w-56">
                    {/* User Info */}
                    <div className="px-3 py-2">
                      <p className="font-medium text-foreground">My Account</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    
                    <div className="h-px bg-border/50" />
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => handleNavigate('/settings')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/30 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={() => handleNavigate('/subscription')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/30 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Subscription
                      </button>
                    </div>
                    
                    <div className="h-px bg-border/50" />
                    
                    <div className="py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <HelpRequestDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </header>
  );
};
