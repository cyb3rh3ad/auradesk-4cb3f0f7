import { Calendar, TrendingUp, Users, MessageSquare, Zap, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  const stats = [
    { 
      title: "Active Teams", 
      value: "12", 
      change: "+2 from last week", 
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      path: "/teams"
    },
    { 
      title: "Messages", 
      value: "2,847", 
      change: "+573 this week", 
      icon: MessageSquare,
      gradient: "from-purple-500 to-pink-500",
      path: "/chat"
    },
    { 
      title: "Meetings", 
      value: "8", 
      change: "3 upcoming today", 
      icon: Calendar,
      gradient: "from-orange-500 to-red-500",
      path: "/meetings"
    },
    { 
      title: "Productivity", 
      value: "+23%", 
      change: "vs last month", 
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500",
      path: null
    },
  ];

  return (
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
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full blur-2xl`} />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="h-4 w-4 text-white" />
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
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-1">
            {[
              { name: "Sarah Chen", action: "shared a file", time: "2 minutes ago", color: "from-blue-500 to-cyan-500" },
              { name: "Mike Johnson", action: "scheduled a meeting", time: "15 minutes ago", color: "from-purple-500 to-pink-500" },
              { name: "AI Assistant", action: "summarized your last meeting", time: "1 hour ago", color: "from-orange-500 to-red-500" },
              { name: "Emily Davis", action: "mentioned you in chat", time: "2 hours ago", color: "from-green-500 to-emerald-500" },
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-4 rounded-xl hover:bg-accent/5 transition-all duration-200 group border border-transparent hover:border-border/50"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-semibold shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                    {item.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">{item.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
