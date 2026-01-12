import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, MessageSquare, Video, Users, Brain, FileText, Zap, Shield, Clock, Download } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    { icon: MessageSquare, title: "Real-time Chat", description: "Instant messaging with your team.", gradient: "from-blue-500 to-cyan-500" },
    { icon: Video, title: "Video Meetings", description: "Schedule and manage meetings.", gradient: "from-purple-500 to-pink-500" },
    { icon: Brain, title: "AI Assistant", description: "Built-in AI chatbot productivity.", gradient: "from-orange-500 to-red-500" },
    { icon: Users, title: "Team Management", description: "Create teams and invite members.", gradient: "from-green-500 to-emerald-500" },
    { icon: FileText, title: "File Sharing", description: "Secure file storage and sharing.", gradient: "from-indigo-500 to-blue-500" },
    { icon: Shield, title: "Request Help", description: "One-click help requests.", gradient: "from-rose-500 to-pink-500" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-3xl font-bold text-primary">AuraDesk</span>
          <Button variant="outline" onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 relative overflow-hidden text-center">
        <div className="container mx-auto max-w-6xl space-y-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Work Smarter with <span className="text-primary">AuraDesk</span></h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">The all-in-one platform for team collaboration and AI-powered productivity.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="https://github.com/cyb3rh3ad/auradesk-4cb3f0f7/releases/download/v1.0.0/AuraDesk_Setup.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-xl font-medium px-10 py-7 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg"
              >
                <Download className="w-6 h-6 mr-3" />
                Download
              </a>
              
              <Button size="lg" variant="outline" className="text-xl px-10 py-7 rounded-xl" onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                <Globe className="w-6 h-6 mr-3" /> Use in Browser
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-sm hover:-translate-y-2 transition-all">
              <CardContent className="pt-6">
                <f.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-border/50 text-center text-muted-foreground">
        <p>© 2026 AuraDesk. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;