import { Button } from "@/components/ui/button";
import { SparklingButton } from "@/components/ui/SparklingButton";
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
import { useState, useEffect } from "react";
import { AppPreview } from "@/components/landing/AppPreview";
import { UserGuideDownload } from "@/components/landing/UserGuideDownload";
import { AuroraLogo, AuroraLogoHero } from "@/components/icons/AuroraLogo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  
  // Performance: Detect mobile for conditional rendering
  const isMobile = useIsMobile();

  // Force dark theme on landing page - always
  useEffect(() => {
    const root = document.documentElement;
    const themes = ['dark', 'theme-discord-dark', 'theme-midnight', 'theme-forest', 'theme-sunset', 'theme-purple'];
    
    // Store current theme to restore later if user navigates away
    const currentTheme = themes.find(t => root.classList.contains(t)) || 'light';
    
    // Force dark theme on landing page
    themes.forEach(t => root.classList.remove(t));
    root.classList.add('dark');
    
    // Cleanup: restore user's theme when leaving landing page
    return () => {
      // Only restore if we're navigating to an authenticated route
      // The ThemeInit component will handle loading the correct theme
      themes.forEach(t => root.classList.remove(t));
      // Don't set any theme here - let ThemeInit handle it based on user preferences
    };
  }, []);

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
      {/* Navigation - cosmic glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-cosmic">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Nav logo */}
            <AuroraLogo size={40} animated={false} />
            <span className="text-2xl md:text-3xl font-bold text-cosmic">
              AuraDesk
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <a
              href="mailto:info.auradesk@gmail.com"
              className="flex items-center gap-2 text-muted-foreground hover:text-cosmic transition-colors text-sm"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden md:inline">info.auradesk@gmail.com</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate("/auth")} 
                    className="gap-1.5 border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                  >
                    Sign In
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-center glass-cosmic border-primary/20">
                  <p className="text-xs">Google Sign-In will redirect you to a secure authentication page. This is normal and keeps your data safe.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </nav>

      {/* Hero Section - performance optimized */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-6 relative overflow-hidden">
        {/* Deep space background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(280,70%,8%)] via-background to-[hsl(220,60%,8%)]" />
        
        {/* Nebula clouds - only on desktop for performance */}
        {!isMobile && (
          <>
            <div 
              className="absolute top-20 left-10 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full blur-3xl opacity-30 animate-nebula-1"
              style={{
                background: 'radial-gradient(circle, hsl(280 70% 50% / 0.4) 0%, transparent 70%)',
              }}
            />
            <div 
              className="absolute bottom-20 right-10 w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full blur-3xl opacity-30 animate-nebula-2"
              style={{
                background: 'radial-gradient(circle, hsl(180 80% 50% / 0.35) 0%, transparent 70%)',
              }}
            />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full blur-3xl opacity-20 animate-nebula-rotate"
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 60%)',
              }}
            />
          </>
        )}

        <div className="container mx-auto max-w-6xl relative">
          {/* On mobile, use simple CSS. On desktop, use motion */}
          <div className="text-center space-y-6 md:space-y-8 animate-fade-in">
            {/* Premium hero logo - SVG-based, truly integrated - BIGGER */}
            <AuroraLogoHero size={isMobile ? 180 : 320} />

            <div 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-cosmic text-sm font-medium"
            >
              <Sparkles className="w-4 h-4 text-cosmic" />
              <span className="text-cosmic">Now with Discord-style voice channels</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              Work Smarter with{" "}
              <span className="text-cosmic-glow">
                AuraDesk
              </span>
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The all-in-one platform for team collaboration, video conferencing, and AI-powered productivity. Like
              Discord meets Zoom, but better.
            </p>

            {/* Mobile: Simple stacked buttons. Desktop: Animated split buttons */}
            {isMobile ? (
              <div className="flex flex-col gap-3 pt-4">
                <SparklingButton
                  href="https://github.com/cyb3rh3ad/auradesk-4cb3f0f7/releases/latest/download/AuraDesk-Setup.exe"
                  download
                  variant="cosmic"
                  hue="blue"
                  className="text-lg h-14 px-8 w-full"
                >
                  <Monitor className="w-5 h-5" />
                  Windows
                </SparklingButton>
                <SparklingButton
                  onClick={() => setShowIOSInstructions(true)}
                  variant="slate"
                  className="text-lg h-14 px-8 w-full"
                >
                  <Smartphone className="w-5 h-5" />
                  iOS
                </SparklingButton>
                <SparklingButton
                  onClick={() => setShowAndroidInstructions(true)}
                  variant="cosmic"
                  className="text-lg h-14 px-8 w-full"
                >
                  <Smartphone className="w-5 h-5" />
                  Android
                </SparklingButton>
                <SparklingButton
                  onClick={() => navigate(user ? "/dashboard" : "/auth")}
                  variant="outline"
                  className="text-lg h-14 px-8 w-full"
                >
                  <Globe className="w-5 h-5" />
                  Use in Browser
                </SparklingButton>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                {/* Meiosis-style Splitting Download Button - Desktop only */}
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
                    <SparklingButton
                      onClick={() => setShowDownloadOptions(true)}
                      variant="cosmic"
                      className="text-lg h-14 px-8 w-full"
                    >
                      <Download className="w-5 h-5" />
                      Download App
                    </SparklingButton>
                  </motion.div>

                  {/* The two daughter cells - simple and clean */}
                  <div className="relative flex items-center justify-center h-full w-full">
                    {/* Left cell - Windows */}
                    <motion.div
                      className="absolute left-0"
                      animate={{ 
                        opacity: showDownloadOptions ? 1 : 0,
                        scale: showDownloadOptions ? 1 : 0.92,
                        x: showDownloadOptions ? -4 : -8,
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      style={{ pointerEvents: showDownloadOptions ? "auto" : "none" }}
                    >
                      <SparklingButton
                        href="https://github.com/cyb3rh3ad/auradesk-4cb3f0f7/releases/latest/download/AuraDesk-Setup.exe"
                        download
                        variant="cosmic"
                        hue="blue"
                        className="text-base h-14 px-6 w-[136px]"
                      >
                        <Monitor className="w-4 h-4" />
                        Windows
                      </SparklingButton>
                    </motion.div>

                    {/* Right cell - Mobile (expands to iOS/Android) */}
                    <motion.div
                      className="absolute right-0"
                      animate={{ 
                        opacity: showDownloadOptions ? 1 : 0,
                        scale: showDownloadOptions ? 1 : 0.92,
                        x: showDownloadOptions ? 4 : 8,
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      style={{ pointerEvents: showDownloadOptions ? "auto" : "none" }}
                    >
                      <div 
                        className="relative h-14 flex items-center justify-center"
                        style={{ width: '136px' }}
                        onMouseEnter={() => setShowMobileOptions(true)}
                        onMouseLeave={() => setShowMobileOptions(false)}
                      >
                        {/* Mobile button - splits into iOS/Android */}
                        <motion.div
                          className="absolute inset-0"
                          animate={{ 
                            opacity: showMobileOptions ? 0 : 1,
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          style={{ pointerEvents: showMobileOptions ? "none" : "auto" }}
                        >
                          <SparklingButton
                            onClick={() => setShowMobileOptions(true)}
                            variant="cosmic"
                            className="text-base h-14 px-6 w-full"
                          >
                            <Smartphone className="w-4 h-4" />
                            Mobile
                          </SparklingButton>
                        </motion.div>

                        {/* iOS Button */}
                        <motion.div
                          className="absolute"
                          animate={{ 
                            opacity: showMobileOptions ? 1 : 0,
                            x: showMobileOptions ? -35 : 0,
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          style={{ pointerEvents: showMobileOptions ? "auto" : "none" }}
                        >
                          <SparklingButton
                            onClick={() => setShowIOSInstructions(true)}
                            variant="slate"
                            className="text-sm h-14 px-4 w-[66px]"
                          >
                            iOS
                          </SparklingButton>
                        </motion.div>

                        {/* Android Button */}
                        <motion.div
                          className="absolute"
                          animate={{ 
                            opacity: showMobileOptions ? 1 : 0,
                            x: showMobileOptions ? 35 : 0,
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          style={{ pointerEvents: showMobileOptions ? "auto" : "none" }}
                        >
                          <SparklingButton
                            onClick={() => setShowAndroidInstructions(true)}
                            variant="cosmic"
                            className="text-sm h-14 px-4 w-[66px]"
                          >
                            Android
                          </SparklingButton>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <SparklingButton
                  onClick={() => navigate(user ? "/dashboard" : "/auth")}
                  variant="outline"
                  className="text-lg h-14 px-8 w-[280px]"
                >
                  <Globe className="w-5 h-5" />
                  Use in Browser
                </SparklingButton>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Bar - cosmic styling - no motion on mobile */}
      <section className="py-10 px-6 glass-cosmic border-y-0">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <p className="text-2xl md:text-3xl font-bold text-cosmic-glow">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights - cosmic cards */}
      <section className="py-12 md:py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {highlights.map((item, index) => (
              <div
                key={index}
                className="relative flex items-center gap-3 p-4 rounded-2xl glass-cosmic overflow-hidden group hover:scale-105 hover:-translate-y-1 transition-transform duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glow effect on hover - CSS only */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 30% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
                  }}
                />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(180,80%,50%)] via-[hsl(var(--primary))] to-[hsl(280,70%,55%)] flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="relative">
                  <p className="font-semibold text-sm text-cosmic">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive App Preview */}
          <div className="mt-12 md:mt-16 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <AppPreview />
          </div>
        </div>
      </section>

      {/* Features Section - cosmic styling */}
      <section className="py-16 md:py-24 px-6 relative overflow-hidden">
        {/* Background nebula effect - static for performance */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(260,30%,6%)] via-background to-background" />
        <div 
          className="absolute top-0 left-1/4 w-[400px] md:w-[600px] h-[300px] md:h-[400px] rounded-full blur-3xl opacity-20"
          style={{
            background: 'radial-gradient(ellipse, hsl(280 70% 40% / 0.4) 0%, transparent 70%)',
          }}
        />
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12 md:mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Everything you need, <span className="text-cosmic-glow">in one place</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stop juggling between Slack, Discord, Zoom, and Google Meet. AuraDesk brings it all together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="animate-fade-in hover:scale-[1.02] hover:-translate-y-2 transition-transform duration-200"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="relative glass-cosmic border-0 h-full group overflow-hidden">
                  {/* Cosmic glow on hover - CSS only */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.2) 0%, transparent 60%)',
                    }}
                  />
                  <CardContent className="relative pt-6 pb-6">
                    <div
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(180,80%,50%)] via-[hsl(var(--primary))] to-[hsl(280,70%,55%)] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300"
                    >
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-cosmic">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases - cosmic styling - CSS animations only */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for <span className="text-cosmic">everyone</span></h2>
            <p className="text-muted-foreground text-lg">From startups to gaming communities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 rounded-2xl glass-cosmic group animate-fade-in hover:scale-[1.02] transition-transform duration-200"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">{useCase.image}</div>
                <div>
                  <h3 className="font-bold text-lg mb-2 text-cosmic">{useCase.title}</h3>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - cosmic styling */}
      <section className="py-16 md:py-24 px-6 relative overflow-hidden">
        {/* Background - static for performance */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[hsl(260,30%,6%)] to-background" />
        <div 
          className="absolute bottom-0 right-1/4 w-[350px] md:w-[500px] h-[200px] md:h-[300px] rounded-full blur-3xl opacity-15"
          style={{
            background: 'radial-gradient(ellipse, hsl(180 80% 50% / 0.4) 0%, transparent 70%)',
          }}
        />
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Team Behind <span className="text-cosmic-glow">AuraDesk</span></h2>
            <p className="text-muted-foreground text-lg">Built with passion by people who care</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="animate-fade-in hover:scale-[1.02] hover:-translate-y-1 transition-transform duration-200"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="glass-cosmic border-0 h-full flex flex-col overflow-hidden group">
                  <CardContent className="relative pt-6 flex flex-col flex-1">
                    {/* Glow effect - CSS only */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse at 50% 100%, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
                      }}
                    />
                    <div className="relative flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[hsl(45,90%,55%)] text-[hsl(45,90%,55%)]" />
                      ))}
                    </div>
                    <p className="relative text-muted-foreground mb-6 leading-relaxed flex-1">"{testimonial.content}"</p>
                    <div className="relative flex items-center gap-3 mt-auto">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(180,80%,50%)] via-[hsl(var(--primary))] to-[hsl(280,70%,55%)] flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-primary/30">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-cosmic">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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

      {/* Footer - cosmic styling */}
      <footer className="py-8 md:py-12 px-6 glass-cosmic border-t-0">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <span className="text-xl font-bold text-cosmic">
                AuraDesk
              </span>
              <span className="text-muted-foreground text-sm">© 2026 All rights reserved.</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <a
                href="mailto:info.auradesk@gmail.com"
                className="text-sm text-muted-foreground hover:text-cosmic transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                info.auradesk@gmail.com
              </a>
              <div className="flex items-center gap-4">
                <UserGuideDownload variant="link" />
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-cosmic transition-colors">
                  Terms
                </Link>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-cosmic transition-colors">
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* iOS Installation Instructions Dialog */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md" aria-describedby="ios-install-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install AuraDesk on iOS
            </DialogTitle>
          </DialogHeader>
          <div id="ios-install-description" className="space-y-4 pt-4">
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
        <DialogContent className="sm:max-w-md" aria-describedby="android-install-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install AuraDesk on Android
            </DialogTitle>
          </DialogHeader>
          <div id="android-install-description" className="space-y-4 pt-4">
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
