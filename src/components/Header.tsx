import { useState } from 'react';
import { Search, Bell, User, Command, LogOut, HeadphonesIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HelpRequestDialog } from "./HelpRequestDialog";

export const Header = () => {
  const { user, signOut } = useAuth();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 flex items-center justify-between px-4 md:px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      {!isMobile && (
        <div className="flex items-center flex-1 max-w-2xl relative z-10">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Command className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Search messages, files, or people..."
              className="pl-11 pr-11 bg-muted/30 border border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 rounded-xl h-11 transition-all duration-200 focus-visible:shadow-lg focus-visible:shadow-primary/10"
            />
          </div>
        </div>
      )}
      
      <div className={cn("flex items-center space-x-1 relative z-10", isMobile && "ml-auto")}>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHelpDialogOpen(true)}
            className="gap-2 hover:bg-accent/10 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <HeadphonesIcon className="h-4 w-4" />
            Request Help
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent/10 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-accent/10 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                  {user?.email ? getInitials(user.email) : 'AD'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isMobile && (
              <>
                <DropdownMenuItem onClick={() => setHelpDialogOpen(true)} className="cursor-pointer">
                  <HeadphonesIcon className="mr-2 h-4 w-4" />
                  <span>Request Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={signOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <HelpRequestDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </header>
  );
};
