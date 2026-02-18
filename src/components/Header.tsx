import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Command, LogOut, Settings, User, Circle, Moon, MinusCircle, CheckCircle2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HelpRequestDialog } from "./HelpRequestDialog";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { FocusModeToggle } from "./FocusModeToggle";
import { AnimatedSearchIcon, AnimatedHeadphonesIcon } from "@/components/icons/AnimatedIcons";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { PresenceIndicator } from "./PresenceIndicator";
import { PresenceStatus } from "@/hooks/usePresence";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { myStatus, setManualStatus } = usePresenceContext();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const statusOptions: { status: 'online' | 'dnd'; icon: React.ReactNode; label: string; color: string }[] = [
    { status: 'online', icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: 'Available', color: 'text-green-500' },
    { status: 'dnd', icon: <MinusCircle className="w-4 h-4 text-red-500" />, label: 'Do Not Disturb', color: 'text-red-500' },
  ];

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Update menu position when opened
  useEffect(() => {
    if (profileMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [profileMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
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
    <header className="h-14 md:h-16 border-b border-border/30 bg-background/80 backdrop-blur-xl flex items-center justify-between px-3 md:px-6 relative z-[100]">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      {/* Subtle top glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

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

      <div className={cn("flex items-center gap-1.5 relative z-10", isMobile && "ml-auto")}>
        {/* Mobile: Icon-only help button */}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHelpDialogOpen(true)}
            className="w-9 h-9 rounded-xl hover:bg-accent/10 transition-all duration-200 touch-feedback"
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

        <FocusModeToggle />

        <div className={cn(isMobile ? "mx-0.5" : "mx-1")}>
          <NotificationsDropdown />
        </div>
        {/* Profile Menu */}
        <div className="relative ml-1 md:ml-4">
          <button 
            ref={buttonRef}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="rounded-full transition-all duration-200 hover:ring-2 hover:ring-primary/30 touch-feedback"
          >
            <Avatar className={cn(
              "ring-2 ring-primary/20 transition-all",
              isMobile ? "w-8 h-8" : "w-9 h-9"
            )}>
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-medium">
                {user?.email ? getInitials(user.email) : "AD"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5">
              <PresenceIndicator status={myStatus} size="sm" />
            </span>
          </button>

          {/* Portal dropdown to body */}
          {profileMenuOpen && createPortal(
            <div ref={profileMenuRef}>
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="fixed w-64 bg-popover border border-border/50 shadow-2xl rounded-2xl overflow-hidden"
                  style={{ 
                    transformOrigin: "top right",
                    top: menuPosition.top,
                    right: menuPosition.right,
                    zIndex: 99999
                  }}
              >
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
                
                {/* Status picker */}
                <div className="p-2 border-t border-border/50">
                  <button
                    onClick={() => setStatusPickerOpen(!statusPickerOpen)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-muted/80 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <PresenceIndicator status={myStatus} size="sm" />
                    </div>
                    <span className="flex-1 text-left">
                      {myStatus === 'dnd' ? 'Do Not Disturb' : myStatus === 'idle' ? 'Idle' : myStatus === 'in_call' ? 'In a Call' : 'Available'}
                    </span>
                    <Circle className={cn("w-3 h-3 text-muted-foreground transition-transform", statusPickerOpen && "rotate-90")} />
                  </button>
                  <AnimatePresence>
                    {statusPickerOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 py-1 space-y-0.5">
                          {statusOptions.map((opt) => (
                            <button
                              key={opt.status}
                              onClick={() => {
                                setManualStatus(opt.status);
                                setStatusPickerOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-muted/80 transition-colors",
                                ((myStatus === 'online' && opt.status === 'online') || (myStatus === 'dnd' && opt.status === 'dnd')) && "bg-muted/60"
                              )}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Menu items */}
                <div className="p-2">
                  <button
                    onClick={() => handleMenuItemClick('/settings')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-muted/80 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => handleMenuItemClick('/subscription')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-muted/80 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span>Subscription</span>
                  </button>
                </div>
                
                {/* Sign out footer */}
                <div className="p-2 border-t border-border/50">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-destructive/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-destructive" />
                    </div>
                    <span className="text-destructive">Sign out</span>
                  </button>
                </div>
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
