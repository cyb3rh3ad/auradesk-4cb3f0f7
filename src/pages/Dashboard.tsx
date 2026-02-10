import { useState, useEffect } from "react";
import { Calendar, Users, MessageSquare, Zap, ArrowUpRight, Clock, Video, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useMeetings } from "@/hooks/useMeetings";
import { useRecentContacts } from "@/hooks/useRecentContacts";
import { useTeams } from "@/hooks/useTeams";
import { useConversations } from "@/hooks/useConversations";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PageHeader, AnimatedCard, StaggeredList } from "@/components/PageTransition";

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { meetings, refetch: refetchMeetings } = useMeetings();
  const { contacts, loading: contactsLoading, refetch: refetchContacts } = useRecentContacts(5);
  const { teams } = useTeams();
  const { conversations } = useConversations();
  const { totalUnread } = useUnreadMessages();
  const { getStatus } = usePresenceContext();
  
  const handleRefresh = async () => {
    await Promise.all([refetchMeetings(), refetchContacts()]);
  };

  // Get the next upcoming meeting
  const upcomingMeeting = meetings
    ?.filter(m => new Date(m.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  
  const upcomingMeetingsCount = meetings?.filter(m => new Date(m.scheduled_at) > new Date()).length || 0;

  const stats = [
    { 
      title: "Active Teams", 
      value: String(teams.length), 
      change: `${teams.length} team${teams.length !== 1 ? 's' : ''} joined`, 
      icon: Users,
      gradientFrom: "from-gradient-blue",
      gradientTo: "to-gradient-blue-end",
      path: "/teams"
    },
    { 
      title: "Conversations", 
      value: String(conversations.length), 
      change: `${conversations.length} active chat${conversations.length !== 1 ? 's' : ''}`, 
      icon: MessageSquare,
      gradientFrom: "from-gradient-purple",
      gradientTo: "to-gradient-purple-end",
      path: "/chat"
    },
    { 
      title: "Meetings", 
      value: String(meetings?.length || 0), 
      change: `${upcomingMeetingsCount} upcoming`, 
      icon: Calendar,
      gradientFrom: "from-gradient-orange",
      gradientTo: "to-gradient-orange-end",
      path: "/meetings"
    },
    { 
      title: "Unread Messages", 
      value: String(totalUnread), 
      change: totalUnread > 0 ? `${totalUnread} waiting` : 'All caught up', 
      icon: Mail,
      gradientFrom: "from-gradient-indigo",
      gradientTo: "to-gradient-indigo-end",
      path: "/chat"
    },
  ];

  const content = (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <PageHeader
        pageId="dashboard"
        icon={<Zap className="w-5 h-5 md:w-6 md:h-6 text-primary" />}
        title="Welcome to AuraDesk"
        subtitle="Your intelligent collaboration workspace"
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
        {stats.map((stat, i) => (
          <AnimatedCard
            key={i}
            index={i}
            className={cn(
              "relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 group touch-feedback rounded-xl",
              stat.path && 'cursor-pointer',
              "hover:shadow-2xl hover:shadow-primary/10"
            )}
            onClick={() => stat.path && navigate(stat.path)}
          >
            <Card className="border-0 bg-transparent shadow-none">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <div className={`absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} opacity-5 rounded-full blur-2xl`} />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{stat.title}</CardTitle>
                <motion.div 
                  className={`p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} shadow-lg`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <stat.icon className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
                </motion.div>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <motion.div 
                  className="text-2xl md:text-3xl font-bold mb-1"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.2, type: "spring", stiffness: 300 }}
                >
                  {stat.value}
                </motion.div>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="line-clamp-1">{stat.change}</span>
                </p>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}

        {/* Upcoming Meeting Card */}
        <AnimatedCard
          index={3}
          className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 group cursor-pointer touch-feedback rounded-xl hover:shadow-2xl hover:shadow-primary/10"
          onClick={() => navigate('/meetings')}
        >
          <Card className="border-0 bg-transparent shadow-none">
            <div className="absolute inset-0 bg-gradient-to-br from-gradient-green to-gradient-green-end opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br from-gradient-green to-gradient-green-end opacity-5 rounded-full blur-2xl" />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Next Meeting</CardTitle>
              <motion.div 
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gradient-to-br from-gradient-green to-gradient-green-end shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Video className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
              </motion.div>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {upcomingMeeting ? (
                <>
                  <div className="text-base md:text-lg font-bold mb-1 line-clamp-1">{upcomingMeeting.title}</div>
                  <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 mb-0.5 md:mb-1">
                    <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    {format(new Date(upcomingMeeting.scheduled_at), 'MMM d, h:mm a')}
                  </p>
                  {upcomingMeeting.duration_minutes && (
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      Duration: {upcomingMeeting.duration_minutes} min
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="text-xl md:text-2xl font-bold mb-1">No meetings</div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    Schedule your next meeting
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Recent Contacts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-1">
              {contactsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent contacts yet.</p>
                  <p className="text-sm mt-1">Start chatting with friends to see them here!</p>
                </div>
              ) : (
                contacts.map((contact, i) => {
                  const gradientClasses = [
                    "from-gradient-blue to-gradient-blue-end",
                    "from-gradient-purple to-gradient-purple-end",
                    "from-gradient-orange to-gradient-orange-end",
                    "from-gradient-green to-gradient-green-end",
                    "from-gradient-indigo to-gradient-indigo-end",
                  ];
                  const initials = contact.full_name 
                    ? contact.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : contact.username?.slice(0, 2).toUpperCase() || contact.email.slice(0, 2).toUpperCase();
                  
                  return (
                    <motion.div 
                      key={contact.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.4, type: "spring", stiffness: 300 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(contact.conversation_id ? `/chat?conversation=${contact.conversation_id}` : '/chat')}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-accent/5 transition-all duration-200 group border border-transparent hover:border-border/50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="relative"
                        >
                          <Avatar className="w-12 h-12 rounded-2xl shadow-lg">
                            <AvatarImage src={contact.avatar_url || undefined} />
                            <AvatarFallback className={`rounded-2xl bg-gradient-to-br ${gradientClasses[i % gradientClasses.length]} text-primary-foreground font-semibold`}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator status={getStatus(contact.id)} size="md" />
                          </span>
                        </motion.div>
                        <div>
                          <p className="text-sm font-semibold">{contact.full_name || contact.username || contact.email}</p>
                          {contact.username && <p className="text-xs text-muted-foreground">@{contact.username}</p>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full overflow-auto">
        {content}
      </PullToRefresh>
    );
  }

  return content;
};

export default Dashboard;
