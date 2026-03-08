import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Video, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'message' | 'meeting' | 'team';
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

      // Fetch recent messages - batch profile lookup
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, conversation_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (messages && messages.length > 0) {
        // Batch fetch all sender profiles at once (avoid N+1)
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, email')
          .in('id', senderIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        for (const msg of messages) {
          const profile = profileMap.get(msg.sender_id);
          const senderName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Someone';
          items.push({
            id: `msg-${msg.id}`,
            type: 'message',
            title: msg.sender_id === user.id ? 'You sent a message' : `${senderName} messaged`,
            subtitle: msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
            timestamp: msg.created_at,
            icon: MessageSquare,
            gradient: 'from-gradient-blue to-gradient-blue-end',
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
            gradient: 'from-gradient-purple to-gradient-purple-end',
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
            gradient: 'from-gradient-green to-gradient-green-end',
          });
        });
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items.slice(0, 10));
      setLoading(false);
    };

    fetchActivities();
  }, [user]);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse p-3">
                <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded w-2/5" />
                  <div className="h-2.5 bg-muted/70 rounded w-3/5" />
                </div>
                <div className="h-2.5 bg-muted/50 rounded w-12" />
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
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Clock className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground/70">No recent activity</p>
            <p className="text-xs text-muted-foreground">Start chatting or scheduling meetings!</p>
          </div>
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
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/5 transition-colors"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg',
                    activity.gradient
                  )}>
                    <Icon className="w-4 h-4 text-primary-foreground" />
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
