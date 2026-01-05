import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const NotificationsDropdown = () => {
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Welcome to AuraDesk',
      message: 'Get started by exploring the dashboard',
      time: '5 min ago',
      read: false,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem 
              key={notification.id} 
              className="flex flex-col items-start gap-1 p-3 cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <span className="font-medium">{notification.title}</span>
                {!notification.read && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{notification.message}</p>
              <span className="text-xs text-muted-foreground/60">{notification.time}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
