import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Globe, MessageSquare, Video, Users, Brain, FileText, Zap, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const features = [
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Instant messaging with your team, including group chats and direct messages",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Video,
      title: "Video Meetings",
      description: "Schedule and manage meetings with AI-powered summaries",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Brain,
      title: "AI Assistant",
      description: "Built-in AI chatbot to help with tasks, questions, and productivity",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Create teams, invite members, and collaborate seamlessly",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: FileText,
      title: "File Sharing",
      description: "Secure file storage and sharing with your team members",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: Shield,
      title: "Request Help",
      description: "One-click help requests with remote assistance capabilities",
      gradient: "from-rose-500 to-pink-500"
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized performance for seamless collaboration"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Enterprise-grade security for your data"
    },
    {
      icon: Clock,
      title: "24/7 Available",
      description: "Access your workspace anytime, anywhere"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-primary">AuraDesk</span>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-6xl relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            <div className="inline-block">
              <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
                ✨ Your Intelligent Collaboration Workspace
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Work Smarter with{" "}
              <span className="text-primary">AuraDesk</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              The all-in-one platform for team collaboration, AI-powered productivity, 
              and seamless communication. Everything your team needs in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 gradient-primary hover:opacity-90 transition-all hover:scale-105 shadow-lg group"
                onClick={() => {
                  // Create a download link for a hypothetical installer
                  const link = document.createElement('a');
                  link.href = '#'; // In real scenario, this would be the actual download URL
                  link.download = 'AuraDesk-Setup.exe';
                  toast({
                    title: "Download Started",
                    description: "Desktop app download will be available soon!",
                  });
                }}
              >
                <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                Download for PC
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6 border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                <Globe className="w-5 h-5 mr-2" />
                Use in Browser
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Free to start • No credit card required • Works on Windows, Mac, Linux & Web
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Collaborate
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to boost your team's productivity
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2 group h-full">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  
                  <CardContent className="pt-6 relative">
                    <feature.icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <benefit.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-4xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of teams already using AuraDesk
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 gradient-primary hover:opacity-90 transition-all hover:scale-105 shadow-lg"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                Get Started Free
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xl font-bold text-primary">AuraDesk</span>
            <p className="text-sm text-muted-foreground">
              © 2025 AuraDesk. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
