import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, MessageSquare, Video, Users, Brain, FileText, Zap, Shield, Clock, Download, Mail } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Instant messaging with your team, friends, and colleagues with seamless synchronization.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Video,
      title: "Video Meetings",
      description: "High-quality video calls with screen sharing, transcription, and AI-powered summaries.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Brain,
      title: "AI Assistant",
      description: "Built-in AI chatbot for productivity, code assistance, and smart document analysis.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Create teams, manage channels, and collaborate with powerful role-based access.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: FileText,
      title: "File Sharing",
      description: "Secure file storage and sharing with team members and conversation participants.",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: Shield,
      title: "Remote Support",
      description: "Request help from teammates with one-click connection codes for peer assistance.",
      gradient: "from-rose-500 to-pink-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
            AuraDesk
          </span>
          <div className="flex items-center gap-4">
            <a 
              href="mailto:info.auradesk@gmail.com" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">info.auradesk@gmail.com</span>
            </a>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-blue-500/10" />
        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Work Smarter with{" "}
              <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                AuraDesk
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              The all-in-one platform for team collaboration, video conferencing, and AI-powered productivity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a
                href="https://github.com/cyb3rh3ad/auradesk-4cb3f0f7/releases/download/v1.0.0/AuraDesk_Setup.exe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-lg font-medium bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 px-8 py-4"
              >
                <Download className="w-5 h-5 mr-2" />
                Download for Windows
              </a>
              
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 rounded-xl border-2"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                <Globe className="w-5 h-5 mr-2" />
                Use in Browser
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            Everything you need in one place
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:-translate-y-2 transition-all duration-300 h-full">
                  <CardContent className="pt-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-6">
            Have questions or need support? Reach out to us anytime.
          </p>
          <a
            href="mailto:info.auradesk@gmail.com"
            className="inline-flex items-center gap-2 text-lg text-primary hover:underline"
          >
            <Mail className="w-5 h-5" />
            info.auradesk@gmail.com
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                AuraDesk
              </span>
              <span className="text-muted-foreground text-sm">
                © 2026 All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <a
                href="mailto:info.auradesk@gmail.com"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;