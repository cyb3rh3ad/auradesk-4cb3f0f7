import { Search, Bell, User, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 flex items-center justify-between px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
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
      
      <div className="flex items-center space-x-1 relative z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent/10 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="hover:bg-accent/10 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md"
        >
          <User className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
