import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
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

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/30 transition-all">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                  {user?.email ? getInitials(user.email) : "AD"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">My Account</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/subscription')}>
              <User className="mr-2 h-4 w-4" />
              Subscription
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <HelpRequestDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </header>
  );
};
