import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Command, 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator 
} from '@/components/ui/command';
import { 
  Home, MessageSquare, Users, Video, FileText, Sparkles, Settings, 
  Crown, Shield, Search, Moon, Sun, LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isOwner } = useUserRole();

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const runCommand = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  const navItems = useMemo(() => [
    { icon: Home, label: 'Dashboard', path: '/dashboard', shortcut: '⌘1' },
    { icon: MessageSquare, label: 'Chat', path: '/chat', shortcut: '⌘2' },
    { icon: Users, label: 'Teams', path: '/teams', shortcut: '⌘3' },
    { icon: Video, label: 'Meetings', path: '/meetings', shortcut: '⌘4' },
    { icon: FileText, label: 'Files', path: '/files', shortcut: '⌘5' },
    { icon: Sparkles, label: 'AI Assistant', path: '/ai', shortcut: '⌘6' },
    { icon: Crown, label: 'Subscription', path: '/subscription' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    ...(isOwner ? [{ icon: Shield, label: 'Admin Panel', path: '/admin' }] : []),
  ], [isOwner]);

  const actions = useMemo(() => [
    { icon: Moon, label: 'Toggle Dark Mode', action: () => {
      const root = document.documentElement;
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
      } else {
        root.classList.add('dark');
      }
    }},
    { icon: LogOut, label: 'Sign Out', action: () => signOut() },
  ], [signOut]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map(item => (
            <CommandItem 
              key={item.path} 
              onSelect={() => runCommand(() => navigate(item.path))}
              className="gap-3"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
              {item.shortcut && (
                <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {actions.map(item => (
            <CommandItem 
              key={item.label} 
              onSelect={() => runCommand(item.action)}
              className="gap-3"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
