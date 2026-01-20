import { Calendar, Users, MessageSquare, Zap, ArrowUpRight, Clock, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useMeetings } from "@/hooks/useMeetings";
import { useRecentContacts } from "@/hooks/useRecentContacts";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { meetings, refetch: refetchMeetings } = useMeetings();
  const { contacts, loading: contactsLoading, refetch: refetchContacts } = useRecentContacts(5);
  
  const handleRefresh = async () => {
    await Promise.all([refetchMeetings(), refetchContacts()]);
  };

  // Get the next upcoming meeting
  const upcomingMeeting = meetings
    ?.filter(m => new Date(m.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  
  const stats = [
    { 
      title: "Active Teams", 
      value: "12", 
      change: "+2 from last week", 
      icon: Users,
      gradientFrom: "from-gradient-blue",
      gradientTo: "to-gradient-blue-end",
      path: "/teams"
    },
    { 
      title: "Messages", 
      value: "2,847", 
      change: "+573 this week", 
      icon: MessageSquare,
      gradientFrom: "from-gradient-purple",
      gradientTo: "to-gradient-purple-end",
      path: "/chat"
    },
    { 
      title: "Meetings", 
      value: "8", 
      change: "3 upcoming today", 
      icon: Calendar,
      gradientFrom: "from-gradient-orange",
      gradientTo: "to-gradient-orange-end",
      path: "/meetings"
    },
  ];

  const content = (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">
              Welcome to AuraDesk
            </h1>
          </div>
          <p className="text-sm md:text-lg text-muted-foreground">Your intelligent collaboration workspace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            onClick={() => stat.path && navigate(stat.path)}
            className={`relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 group ${stat.path ? 'cursor-pointer' : ''}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} opacity-5 rounded-full blur-2xl`} />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradientFrom} ${stat.gradientTo} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="h-4 w-4 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Upcoming Meeting Card */}
        <Card 
          onClick={() => navigate('/meetings')}
          className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
          style={{ animationDelay: '300ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gradient-green to-gradient-green-end opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gradient-green to-gradient-green-end opacity-5 rounded-full blur-2xl" />
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Meeting</CardTitle>
            <div className="p-2 rounded-xl bg-gradient-to-br from-gradient-green to-gradient-green-end shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Video className="h-4 w-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {upcomingMeeting ? (
              <>
                <div className="text-lg font-bold mb-1 line-clamp-1">{upcomingMeeting.title}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(upcomingMeeting.scheduled_at), 'MMM d, h:mm a')}
                </p>
                {upcomingMeeting.duration_minutes && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {upcomingMeeting.duration_minutes} min
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-1">No meetings</div>
                <p className="text-xs text-muted-foreground">
                  Schedule your next meeting
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Recent Contacts</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
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
                  <div 
                    key={contact.id} 
                    onClick={() => navigate(contact.conversation_id ? `/chat?conversation=${contact.conversation_id}` : '/chat')}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-accent/5 transition-all duration-200 group border border-transparent hover:border-border/50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className={`w-12 h-12 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                        <AvatarImage src={contact.avatar_url || undefined} />
                        <AvatarFallback className={`rounded-2xl bg-gradient-to-br ${gradientClasses[i % gradientClasses.length]} text-primary-foreground font-semibold`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{contact.full_name || contact.username || contact.email}</p>
                        {contact.username && <p className="text-xs text-muted-foreground">@{contact.username}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      {formatDistanceToNow(new Date(contact.last_message_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
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
