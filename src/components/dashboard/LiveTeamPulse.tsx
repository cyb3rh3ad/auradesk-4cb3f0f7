import { usePresenceContext } from '@/contexts/PresenceContext';
import { useRecentContacts } from '@/hooks/useRecentContacts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const LiveTeamPulse = () => {
  const { contacts } = useRecentContacts(20);
  const { getStatus } = usePresenceContext();
  const navigate = useNavigate();

  const onlineContacts = contacts.filter(c => {
    const status = getStatus(c.id);
    return status === 'online' || status === 'idle' || status === 'in_call';
  });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-5 h-5 text-primary" />
            {onlineContacts.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full"
              />
            )}
          </div>
          <CardTitle className="text-base">Live Team Pulse</CardTitle>
          <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {onlineContacts.length} online
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {onlineContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No one online right now</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {onlineContacts.slice(0, 12).map((contact, i) => {
              const status = getStatus(contact.id);
              const initials = contact.full_name
                ? contact.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : contact.username?.slice(0, 2).toUpperCase() || '??';

              return (
                <motion.button
                  key={contact.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={() => contact.conversation_id && navigate(`/chat?conversation=${contact.conversation_id}`)}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                  title={contact.full_name || contact.username || ''}
                >
                  <div className="relative">
                    <Avatar className={cn(
                      "w-10 h-10 ring-2 transition-all",
                      status === 'in_call' ? 'ring-orange-500/50' : 'ring-green-500/30',
                      "group-hover:ring-primary/50"
                    )}>
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <PresenceIndicator status={status} size="sm" />
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[52px] group-hover:text-foreground transition-colors">
                    {(contact.full_name || contact.username || '').split(' ')[0]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
