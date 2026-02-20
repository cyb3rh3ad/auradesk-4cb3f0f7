import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Upload, Video, Users, UserPlus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'message' | 'meeting' | 'team' | 'file';
  title: string;
  subtitle: string;
  timestamp: string;
  icon: typeof MessageSquare;
  gradient: string;
}

export const ActivityFeed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchActivities = async () => {
      const items: ActivityItem[] = [];

      // Fetch recent messages across conversations
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, conversation_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (messages) {
        for (const msg of messages) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, email')
            .eq('id', msg.sender_id)
            .single();
          
          const senderName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Someone';
          items.push({
            id: `msg-${msg.id}`,
            type: 'message',
            title: msg.sender_id === user.id ? 'You sent a message' : `${senderName} messaged`,
            subtitle: msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content,
            timestamp: msg.created_at,
            icon: MessageSquare,
            gradient: 'from-blue-500 to-cyan-500',
          });
        }
      }

      // Fetch recent meetings
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, created_at, scheduled_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (meetings) {
        meetings.forEach(m => {
          items.push({
            id: `meet-${m.id}`,
            type: 'meeting',
            title: 'Meeting scheduled',
            subtitle: m.title,
            timestamp: m.created_at,
            icon: Video,
            gradient: 'from-purple-500 to-pink-500',
          });
        });
      }

      // Fetch recent team joins
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('id, joined_at, team_id, user_id, teams(name)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(3);

      if (teamMembers) {
        teamMembers.forEach((tm: any) => {
          items.push({
            id: `team-${tm.id}`,
            type: 'team',
            title: 'Joined team',
            subtitle: tm.teams?.name || 'Unknown team',
            timestamp: tm.joined_at,
            icon: Users,
            gradient: 'from-green-500 to-emerald-500',
          });
        });
      }

      // Sort all by timestamp
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items.slice(0, 10));
      setLoading(false);
    };

    fetchActivities();
  }, [user]);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-2.5 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity yet. Start chatting or scheduling meetings!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1">
            {activities.map((activity, i) => {
              const Icon = activity.icon;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/5 transition-colors"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg',
                    activity.gradient
                  )}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
