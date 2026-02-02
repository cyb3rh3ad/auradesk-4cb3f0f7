import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Globe,
  MessageSquare,
  Video,
  Users,
  Brain,
  FileText,
  Zap,
  Shield,
  Clock,
  Download,
  Mail,
  Check,
  Star,
  Headphones,
  Lock,
  Sparkles,
  ArrowRight,
  Play,
  Smartphone,
  Monitor,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { AppPreview } from "@/components/landing/AppPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);

  const features = [
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Instant messaging with your team, friends, and colleagues with seamless synchronization.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Video,
      title: "HD Video Meetings",
      description: "Crystal-clear video calls with screen sharing, transcription, and AI-powered summaries.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Brain,
      title: "AI Assistant",
      description: "Built-in AI chatbot for productivity, code assistance, and smart document analysis.",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Users,
      title: "Discord-style Teams",
      description: "Create teams with text & voice channels, categories, and unlimited participants.",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: FileText,
      title: "File Sharing",
      description: "Secure file storage and sharing with team members and conversation participants.",
      gradient: "from-indigo-500 to-blue-500",
    },
    {
      icon: Shield,
      title: "Remote Support",
      description: "Request help from teammates with one-click connection codes for peer assistance.",
      gradient: "from-rose-500 to-pink-500",
    },
  ];

  const highlights = [
    {
      icon: Zap,
      label: "Lightning Fast",
      desc: "Sub-second message delivery",
    },
    {
      icon: Lock,
      label: "Secure by Default",
      desc: "End-to-end encryption",
    },
    {
      icon: Headphones,
      label: "Voice Channels",
      desc: "High-quality audio",
    },
    {
      icon: Sparkles,
      label: "AI Powered",
      desc: "Smart transcriptions",
    },
  ];

  const stats = [
    {
      value: "99.9%",
      label: "Uptime",
    },
    {
      value: "< 50ms",
      label: "Latency",
    },
    {
      value: "Unlimited",
      label: "Messages",
    },
    {
      value: "Free",
      label: "Forever Tier",
    },
  ];

  const useCases = [
    {
      title: "For Remote Teams",
      description:
        "Stay connected with your distributed team through voice channels, video meetings, and instant messaging.",
      image: "👥",
    },
    {
      title: "For Gamers",
      description:
        "Create servers with voice channels for your gaming community, just like Discord but with more power.",
      image: "🎮",
    },
    {
      title: "For Developers",
      description: "Built-in AI assistant helps with code review, documentation, and pair programming sessions.",
      image: "💻",
    },
    {
      title: "For Support Teams",
      description: "One-click remote assistance with connection codes makes helping others a breeze.",
      image: "🛠️",
    },
  ];

  const testimonials = [
    {
      name: "Blaž Germič",
      role: "CEO & Founder",
      content:
        "Building AuraDesk has been an incredible journey. We set out to create a tool that actually makes communication simpler, not more complicated. Seeing teams use it daily to collaborate seamlessly is exactly what we envisioned.",
      avatar: "BG",
    },
    {
      name: "Albina Fela Germič",
      role: "Creative Advisor & Tester",
      content: "Every detail matters when it comes to user experience. I've tested every feature extensively to make sure AuraDesk feels intuitive and polished. The result is something we're truly proud of.",
      avatar: "AG",
    },
    {
      name: "Patricija Turnšek",
      role: "Co-Founder",
      content: "From day one, I believed in this vision. AuraDesk isn't just another app—it's a platform built with passion, late nights, and unwavering dedication to helping people connect better.",
      avatar: "PT",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
            AuraDesk
          </span>
          <div className="flex items-center gap-2 md:gap-4">
            <a
              href="mailto:info.auradesk@gmail.com"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden md:inline">info.auradesk@gmail.com</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="gap-1.5">
                    Sign In
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-center">
                  <p className="text-xs">Google Sign-In will redirect you to a secure authentication page. This is normal and keeps your data safe.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-blue-500/10" />
        <div className="absolute top-40 left-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl opacity-50" />

        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6 md:space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Now with Discord-style voice channels
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              Work Smarter with{" "}
              <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                AuraDesk
              </span>
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The all-in-one platform for team collaboration, video conferencing, and AI-powered productivity. Like
              Discord meets Zoom, but better.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {/* Meiosis-style Splitting Download Button */}
              <div 
                className="relative h-14 flex items-center justify-center"
                style={{ width: '280px' }}
                onMouseEnter={() => setShowDownloadOptions(true)}
                onMouseLeave={() => setShowDownloadOptions(false)}
              >
                {/* The unified button - fades out cleanly */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center z-10"
                  animate={{ 
                    opacity: showDownloadOptions ? 0 : 1,
                    scaleX: showDownloadOptions ? 1.02 : 1,
                  }}
                  transition={{ 
                    opacity: { duration: 0.3, ease: "easeOut" },
                    scaleX: { duration: 0.4, ease: "easeOut" },
                  }}
                  style={{ pointerEvents: showDownloadOptions ? "none" : "auto" }}
                >
                  <Button
                    size="lg"
                    className="text-lg font-medium bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 text-white rounded-full shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 h-14 px-8 w-full"
                    onClick={() => setShowDownloadOptions(true)}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download App
                  </Button>
                </motion.div>

                {/* The two daughter cells - simple and clean */}
                <div className="relative flex items-center justify-center h-full w-full">
                  {/* Left cell - Windows */}
                  <motion.div
                    className="absolute left-0"
                    animate={{ 
                      opacity: showDownloadOptions ? 1 : 0,
                      scale: showDownloadOptions ? [0.92, 1.015, 0.995, 1] : 0.92,
                      x: showDownloadOptions ? [-8, -3, -4, -4] : -8,
                    }}
                    transition={{ 
                      opacity: { duration: 0.4, ease: "easeOut" },
                      scale: { duration: 0.9, times: [0, 0.5, 0.75, 1], ease: "easeOut" },
                      x: { duration: 0.9, times: [0, 0.5, 0.75, 1], ease: "easeOut" },
                    }}
                    style={{ pointerEvents: showDownloadOptions ? "auto" : "none" }}
                  >
                    <a
                      href="https://github.com/cyb3rh3ad/auradesk-4cb3f0f7/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-base font-medium bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:from-violet-500 hover:via-purple-500 hover:to-blue-500 text-white rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/30 h-14 px-6 w-[136px]"
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Windows
                    </a>
                  </motion.div>

                  {/* Right cell - Mobile (expands to iOS/Android) */}
                  <motion.div
                    className="absolute right-0"
                    animate={{ 
                      opacity: showDownloadOptions ? 1 : 0,
                      scale: showDownloadOptions ? [0.92, 1.015, 0.995, 1] : 0.92,
                      x: showDownloadOptions ? [8, 3, 4, 4] : 8,
                    }}
                    transition={{ 
                      opacity: { duration: 0.4, ease: "easeOut" },
                      scale: { duration: 0.9, times: [0, 0.5, 0.75, 1], ease: "easeOut" },
                      x: { duration: 0.9, times: [0, 0.5, 0.75, 1], ease: "easeOut" },
                    }}
                    style={{ pointerEvents: showDownloadOptions ? "auto" : "none" }}
                  >
                    <div 
                      className="relative h-14 flex items-center justify-center"
                      style={{ width: '136px' }}
                      onMouseEnter={() => setShowMobileOptions(true)}
                      onMouseLeave={() => setShowMobileOptions(false)}
                    >
                      {/* Mobile button - splits into iOS/Android */}
                      <motion.button
                        className="absolute inset-0 inline-flex items-center justify-center text-base font-medium bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white rounded-full shadow-lg shadow-emerald-500/30 h-14 px-6 w-full"
                        animate={{ 
                          opacity: showMobileOptions ? 0 : 1,
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{ pointerEvents: showMobileOptions ? "none" : "auto" }}
                        onClick={() => setShowMobileOptions(true)}
                      >
                        <Smartphone className="w-4 h-4 mr-2" />
                        Mobile
                      </motion.button>

                      {/* iOS Button */}
                      <motion.button
                        className="absolute inline-flex items-center justify-center text-sm font-medium bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 text-white rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-slate-500/30 h-14 px-4 w-[66px]"
                        animate={{ 
                          opacity: showMobileOptions ? 1 : 0,
                          x: showMobileOptions ? -35 : 0,
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{ pointerEvents: showMobileOptions ? "auto" : "none" }}
                        onClick={() => setShowIOSInstructions(true)}
                      >
                        iOS
                      </motion.button>

                      {/* Android Button */}
                      <motion.button
                        className="absolute inline-flex items-center justify-center text-sm font-medium bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-white rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/30 h-14 px-4 w-[66px]"
                        animate={{ 
                          opacity: showMobileOptions ? 1 : 0,
                          x: showMobileOptions ? 35 : 0,
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{ pointerEvents: showMobileOptions ? "auto" : "none" }}
                        onClick={() => setShowAndroidInstructions(true)}
                      >
                        Android
                      </motion.button>
                    </div>
                  </motion.div>
                </div>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="text-lg h-14 px-8 rounded-full border-2 w-[280px]"
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
              >
                <Globe className="w-5 h-5 mr-2" />
                Use in Browser
              </Button>
            </div>

          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 px-6 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-12 md:py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {highlights.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Interactive App Preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-12 md:mt-16"
          >
            <AppPreview />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Everything you need, <span className="text-primary">in one place</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stop juggling between Slack, Discord, Zoom, and Google Meet. AuraDesk brings it all together.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full group">
                  <CardContent className="pt-6 pb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for everyone</h2>
            <p className="text-muted-foreground text-lg">From startups to gaming communities</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="text-4xl">{useCase.image}</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Team Behind AuraDesk</h2>
            <p className="text-muted-foreground text-lg">Built with passion by people who care</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-card/50 border-border/50 h-full flex flex-col">
                  <CardContent className="pt-6 flex flex-col flex-1">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed flex-1">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3 mt-auto">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 md:py-16 px-6 border-t border-border/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-6">Have questions or need support? We're here to help!</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:info.auradesk@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
            >
              <Mail className="w-5 h-5" />
              info.auradesk@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 px-6 border-t border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                AuraDesk
              </span>
              <span className="text-muted-foreground text-sm">© 2026 All rights reserved.</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <a
                href="mailto:info.auradesk@gmail.com"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                info.auradesk@gmail.com
              </a>
              <div className="flex items-center gap-4">
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* iOS Installation Instructions Dialog */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install AuraDesk on iOS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">
              AuraDesk can be installed as a web app on your iPhone or iPad for a native app experience.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  1
                </div>
                <p className="text-sm">
                  Open <span className="font-medium text-foreground">auradesk.lovable.app</span> in Safari
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  2
                </div>
                <p className="text-sm">
                  Tap the <span className="font-medium text-foreground">Share</span> button (square with arrow)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  3
                </div>
                <p className="text-sm">
                  Scroll down and tap <span className="font-medium text-foreground">"Add to Home Screen"</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  4
                </div>
                <p className="text-sm">
                  Tap <span className="font-medium text-foreground">Add</span> to install the app
                </p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                The app will appear on your home screen and work just like a native app, with offline support and push notifications.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Android Installation Instructions Dialog */}
      <Dialog open={showAndroidInstructions} onOpenChange={setShowAndroidInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install AuraDesk on Android
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">
              AuraDesk can be installed as a web app on your Android device for a native app experience.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  1
                </div>
                <p className="text-sm">
                  Open <span className="font-medium text-foreground">auradesk.lovable.app</span> in Chrome
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  2
                </div>
                <p className="text-sm">
                  Tap the <span className="font-medium text-foreground">menu</span> button (three dots in top-right)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  3
                </div>
                <p className="text-sm">
                  Tap <span className="font-medium text-foreground">"Install app"</span> or <span className="font-medium text-foreground">"Add to Home screen"</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  4
                </div>
                <p className="text-sm">
                  Tap <span className="font-medium text-foreground">Install</span> to confirm
                </p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                The app will appear on your home screen and work just like a native app, with offline support and push notifications.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;
