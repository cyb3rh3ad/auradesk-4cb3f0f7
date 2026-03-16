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
  Vote,
  FileSignature,
  Gamepad2,
  Heart,
  X,
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
  
  const isMobile = useIsMobile();

  // Force dark theme on landing page, restore previous on unmount
  useEffect(() => {
    const root = document.documentElement;
    const themes = ['dark', 'theme-discord-dark', 'theme-midnight', 'theme-forest', 'theme-sunset', 'theme-purple'];
    const previousTheme = themes.find(t => root.classList.contains(t)) || null;
    themes.forEach(t => root.classList.remove(t));
    root.classList.add('dark');
    return () => {
      themes.forEach(t => root.classList.remove(t));
      // Restore the user's previous theme (ThemeInit will also handle this, but avoid flash)
      const saved = localStorage.getItem('auradesk-theme');
      const restore = saved && saved !== 'light' ? saved : previousTheme;
      if (restore) root.classList.add(restore);
    };
  }, []);

  const antiFeatures = [
    { icon: X, text: "No per-seat pricing traps" },
    { icon: X, text: "No enterprise upsell walls" },
    { icon: X, text: "No 47 tabs to find a setting" },
    { icon: X, text: "No mandatory Microsoft account" },
  ];

  const uniqueFeatures = [
    {
      icon: Gamepad2,
      title: "AuraVille",
      description: "A 2D spatial world where your team hangs out. Walk up to someone to start talking. Visit their house. It's like being in the same room — but from anywhere.",
      gradient: "from-[hsl(280,70%,55%)] to-[hsl(180,80%,50%)]",
      tag: "Only in AuraDesk",
    },
    {
      icon: Vote,
      title: "Decision Rooms",
      description: "Stop arguing in chat threads. Create anonymous polls, ranked voting, and deadline-driven decisions. Actually move forward.",
      gradient: "from-[hsl(45,90%,55%)] to-[hsl(25,90%,55%)]",
      tag: "Teams don't have this",
    },
    {
      icon: FileSignature,
      title: "Verified Promises",
      description: "Digital handshakes with signatures and deadlines. When someone says 'I'll do it by Friday,' make it count.",
      gradient: "from-[hsl(150,70%,45%)] to-[hsl(180,70%,50%)]",
      tag: "Teams don't have this",
    },
    {
      icon: Brain,
      title: "AI That Works For You",
      description: "Built-in AI assistant with multiple models. Summarize meetings, draft replies, brainstorm ideas — without a separate subscription.",
      gradient: "from-[hsl(320,70%,55%)] to-[hsl(280,70%,55%)]",
      tag: "No API key needed",
    },
  ];

  const coreFeatures = [
    {
      icon: MessageSquare,
      title: "Rich Chat",
      description: "Voice messages, file sharing, reactions, replies, GIFs, formatting, scheduled messages, and a camera built right in.",
    },
    {
      icon: Video,
      title: "HD Meetings",
      description: "Video calls with screen sharing, live transcription, and AI-powered summaries that actually save time.",
    },
    {
      icon: Users,
      title: "Teams & Channels",
      description: "Discord-style text and voice channels, categories, roles. Built for how real teams actually communicate.",
    },
    {
      icon: FileText,
      title: "File Storage",
      description: "Up to 5GB per file. Drag, drop, share. Your files live where your conversations happen.",
    },
    {
      icon: Shield,
      title: "Remote Help",
      description: "One-click remote assistance codes for when someone needs help right now, not in a ticket queue.",
    },
    {
      icon: Sparkles,
      title: "Smart Themes",
      description: "8 chat bubble themes, per-conversation wallpapers, cosmic aesthetics. Make your workspace yours.",
    },
  ];

  const comparisonPoints = [
    { feature: "Voice channels", auradesk: true, teams: false, slack: false },
    { feature: "Spatial 2D world", auradesk: true, teams: false, slack: false },
    { feature: "Decision rooms", auradesk: true, teams: false, slack: false },
    { feature: "Verified promises", auradesk: true, teams: false, slack: false },
    { feature: "Built-in AI", auradesk: true, teams: "Paid add-on", slack: "Paid add-on" },
    { feature: "Voice messages", auradesk: true, teams: false, slack: true },
    { feature: "Custom themes", auradesk: true, teams: false, slack: false },
    { feature: "Free tier", auradesk: "Generous", teams: "Limited", slack: "Limited" },
  ];

  const testimonials = [
    {
      name: "Blaž Germič",
      role: "CEO & Founder",
      content: "We built AuraDesk because we were tired of paying Microsoft for the privilege of being confused by their UI. Communication tools should be simple, powerful, and actually fun to use.",
      avatar: "BG",
    },
    {
      name: "Albina Fela Germič",
      role: "Creative Advisor & Tester",
      content: "Every detail matters. I've tested every feature to make sure AuraDesk doesn't just work — it feels right. No corporate bloat, no dark patterns.",
      avatar: "AG",
    },
    {
      name: "Patricija Turnšek",
      role: "Co-Founder",
      content: "AuraDesk isn't just another app. It's what happens when people who actually use these tools daily build something better.",
      avatar: "PT",
    },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-cosmic">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuroraLogo size={40} animated={false} />
            <span className="text-2xl md:text-3xl font-bold text-cosmic">AuraDesk</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <a href="mailto:info.auradesk@gmail.com" className="flex items-center gap-2 text-muted-foreground hover:text-cosmic transition-colors text-sm">
              <Mail className="w-4 h-4" />
              <span className="hidden md:inline">info.auradesk@gmail.com</span>
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="gap-1.5 border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all">
                    Sign In
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] text-center glass-cosmic border-primary/20">
                  <p className="text-xs">Google Sign-In will redirect you to a secure authentication page.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </nav>

      {/* Hero Section — Anti-Corporate Positioning */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(280,70%,8%)] via-background to-[hsl(220,60%,8%)]" />
        
        {!isMobile && (
          <>
            <div className="absolute top-20 left-10 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 animate-nebula-1"
              style={{ background: 'radial-gradient(circle, hsl(280 70% 50% / 0.4) 0%, transparent 70%)' }} />
            <div className="absolute bottom-20 right-10 w-[400px] h-[400px] rounded-full blur-3xl opacity-30 animate-nebula-2"
              style={{ background: 'radial-gradient(circle, hsl(180 80% 50% / 0.35) 0%, transparent 70%)' }} />
          </>
        )}

        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center space-y-6 md:space-y-8 animate-fade-in">
            <AuroraLogoHero size={isMobile ? 160 : 280} />

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-cosmic text-sm font-medium">
              <Heart className="w-4 h-4 text-[hsl(350,80%,60%)]" />
              <span className="text-cosmic">Built by people who hate corporate bloatware</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              The workspace that{" "}
              <span className="text-cosmic-glow">doesn't suck</span>
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Chat, calls, meetings, AI, and a virtual world to hang out in — without the enterprise price tag or the 200-page admin guide.
            </p>

            {/* Anti-features bar */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {antiFeatures.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <item.icon className="w-3.5 h-3.5 text-[hsl(350,80%,60%)]" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            {isMobile ? (
              <div className="flex flex-col gap-3 pt-4">
                <SparklingButton href="https://github.com/cyb3rh3ad/auradesk-4cb3f0f7/releases/latest/download/AuraDesk-Setup.exe" download variant="cosmic" hue="blue" className="text-lg h-14 px-8 w-full">
                  <Monitor className="w-5 h-5" /> Windows
                </SparklingButton>
                <SparklingButton onClick={() => setShowIOSInstructions(true)} variant="slate" className="text-lg h-14 px-8 w-full">
                  <Smartphone className="w-5 h-5" /> iOS
                </SparklingButton>
                <SparklingButton onClick={() => setShowAndroidInstructions(true)} variant="cosmic" className="text-lg h-14 px-8 w-full">
                  <Smartphone className="w-5 h-5" /> Android
                </SparklingButton>
                <SparklingButton onClick={() => navigate(user ? "/dashboard" : "/auth")} variant="outline" className="text-lg h-14 px-8 w-full">
                  <Globe className="w-5 h-5" /> Use in Browser
                </SparklingButton>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <div className="relative h-14 flex items-center justify-center" style={{ width: '280px' }}
                  onMouseEnter={() => setShowDownloadOptions(true)} onMouseLeave={() => setShowDownloadOptions(false)}>
                  <motion.div className="absolute inset-0 flex items-center justify-center z-10"
                    animate={{ opacity: showDownloadOptions ? 0 : 1, scaleX: showDownloadOptions ? 1.02 : 1 }}
                    transition={{ opacity: { duration: 0.3 }, scaleX: { duration: 0.4 } }}
                    style={{ pointerEvents: showDownloadOptions ? "none" : "auto" }}>
                    <SparklingButton onClick={() => setShowDownloadOptions(true)} variant="cosmic" className="text-lg h-14 px-8 w-full">
                      <Download className="w-5 h-5" /> Download App
                    </SparklingButton>
                  </motion.div>
                  <div className="relative flex items-center justify-center h-full w-full">
                    <motion.div className="absolute left-0"
                      animate={{ opacity: showDownloadOptions ? 1 : 0, scale: showDownloadOptions ? 1 : 0.92, x: showDownloadOptions ? -4 : -8 }}
                      transition={{ duration: 0.3 }} style={{ pointerEvents: showDownloadOptions ? "auto" : "none" }}>
                      <SparklingButton href="https://github.com/cyb3rh3ad/auradesk-4cb3f0f7/releases/latest/download/AuraDesk-Setup.exe" download variant="cosmic" hue="blue" className="text-base h-14 px-6 w-[136px]">
                        <Monitor className="w-4 h-4" /> Windows
                      </SparklingButton>
                    </motion.div>
                    <motion.div className="absolute right-0"
                      animate={{ opacity: showDownloadOptions ? 1 : 0, scale: showDownloadOptions ? 1 : 0.92, x: showDownloadOptions ? 4 : 8 }}
                      transition={{ duration: 0.3 }} style={{ pointerEvents: showDownloadOptions ? "auto" : "none" }}>
                      <div className="relative h-14 flex items-center justify-center" style={{ width: '136px' }}
                        onMouseEnter={() => setShowMobileOptions(true)} onMouseLeave={() => setShowMobileOptions(false)}>
                        <motion.div className="absolute inset-0"
                          animate={{ opacity: showMobileOptions ? 0 : 1 }}
                          transition={{ duration: 0.3 }} style={{ pointerEvents: showMobileOptions ? "none" : "auto" }}>
                          <SparklingButton onClick={() => setShowMobileOptions(true)} variant="cosmic" className="text-base h-14 px-6 w-full">
                            <Smartphone className="w-4 h-4" /> Mobile
                          </SparklingButton>
                        </motion.div>
                        <motion.div className="absolute" animate={{ opacity: showMobileOptions ? 1 : 0, x: showMobileOptions ? -35 : 0 }}
                          transition={{ duration: 0.3 }} style={{ pointerEvents: showMobileOptions ? "auto" : "none" }}>
                          <SparklingButton onClick={() => setShowIOSInstructions(true)} variant="slate" className="text-sm h-14 px-4 w-[66px]">iOS</SparklingButton>
                        </motion.div>
                        <motion.div className="absolute" animate={{ opacity: showMobileOptions ? 1 : 0, x: showMobileOptions ? 35 : 0 }}
                          transition={{ duration: 0.3 }} style={{ pointerEvents: showMobileOptions ? "auto" : "none" }}>
                          <SparklingButton onClick={() => setShowAndroidInstructions(true)} variant="cosmic" className="text-sm h-14 px-4 w-[66px]">Android</SparklingButton>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </div>
                <SparklingButton onClick={() => navigate(user ? "/dashboard" : "/auth")} variant="outline" className="text-lg h-14 px-8 w-[280px]">
                  <Globe className="w-5 h-5" /> Use in Browser
                </SparklingButton>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* What Makes Us Different — Unique Features */}
      <section className="py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(260,30%,6%)] via-background to-background" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12 md:mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Features your current tool <span className="text-cosmic-glow">doesn't have</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We didn't clone Teams. We built what Teams should have been.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {uniqueFeatures.map((feature, index) => (
              <div key={index} className="animate-fade-in hover:scale-[1.02] hover:-translate-y-1 transition-transform duration-200"
                style={{ animationDelay: `${index * 100}ms` }}>
                <Card className="relative glass-cosmic border-0 h-full group overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.2) 0%, transparent 60%)' }} />
                  <CardContent className="relative pt-6 pb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cosmic bg-primary/10 px-2.5 py-1 rounded-full">
                        {feature.tag}
                      </span>
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

      {/* Comparison Table */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Honest <span className="text-cosmic">comparison</span>
            </h2>
            <p className="text-muted-foreground text-lg">No marketing fluff. Here's what you actually get.</p>
          </div>

          <div className="glass-cosmic rounded-2xl overflow-hidden animate-fade-in">
            <div className="grid grid-cols-4 gap-0 text-sm">
              {/* Header */}
              <div className="p-4 font-semibold text-muted-foreground border-b border-border/20">Feature</div>
              <div className="p-4 font-bold text-cosmic border-b border-border/20 text-center">AuraDesk</div>
              <div className="p-4 font-semibold text-muted-foreground border-b border-border/20 text-center">MS Teams</div>
              <div className="p-4 font-semibold text-muted-foreground border-b border-border/20 text-center">Slack</div>
              
              {comparisonPoints.map((row, i) => (
                <>
                  <div key={`f-${i}`} className="p-3 md:p-4 text-foreground/80 border-b border-border/10">{row.feature}</div>
                  <div key={`a-${i}`} className="p-3 md:p-4 text-center border-b border-border/10">
                    {row.auradesk === true ? (
                      <Check className="w-5 h-5 text-[hsl(150,70%,45%)] mx-auto" />
                    ) : (
                      <span className="text-xs text-[hsl(150,70%,45%)] font-medium">{row.auradesk}</span>
                    )}
                  </div>
                  <div key={`t-${i}`} className="p-3 md:p-4 text-center border-b border-border/10">
                    {row.teams === true ? (
                      <Check className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                    ) : row.teams === false ? (
                      <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{row.teams}</span>
                    )}
                  </div>
                  <div key={`s-${i}`} className="p-3 md:p-4 text-center border-b border-border/10">
                    {row.slack === true ? (
                      <Check className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                    ) : row.slack === false ? (
                      <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{row.slack}</span>
                    )}
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[hsl(260,30%,6%)] to-background" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12 md:mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Plus everything you'd <span className="text-cosmic-glow">expect</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              All the essentials, done right.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feature, index) => (
              <div key={index} className="animate-fade-in hover:scale-[1.02] hover:-translate-y-1 transition-transform duration-200"
                style={{ animationDelay: `${index * 80}ms` }}>
                <Card className="relative glass-cosmic border-0 h-full group overflow-hidden">
                  <CardContent className="relative pt-6 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(180,80%,50%)] via-[hsl(var(--primary))] to-[hsl(280,70%,55%)] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-cosmic">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="py-12 md:py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="animate-fade-in">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pricing that <span className="text-cosmic">respects you</span>
            </h2>
            <p className="text-muted-foreground text-lg">No per-seat surprises. No "contact sales" gates.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {[
              { name: "Free", price: "€0", desc: "For small teams getting started", features: ["Chat & voice channels", "45-min meetings", "100GB file storage", "15 AI messages/week"] },
              { name: "Advanced", price: "€5", desc: "For teams that need more", features: ["90-min meetings", "1TB file storage", "20 AI messages/week", "Priority support"], popular: true },
              { name: "Professional", price: "€12", desc: "For power users", features: ["Unlimited meetings", "10TB file storage", "Unlimited AI", "Everything included"] },
            ].map((plan, i) => (
              <Card key={i} className={`glass-cosmic border-0 relative overflow-hidden ${plan.popular ? 'ring-2 ring-primary/50 scale-[1.02]' : ''}`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-xl">
                    Popular
                  </div>
                )}
                <CardContent className="pt-6 pb-6">
                  <h3 className="text-lg font-bold text-cosmic">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">{plan.desc}</p>
                  <ul className="space-y-2">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-foreground/80">
                        <Check className="w-4 h-4 text-[hsl(150,70%,45%)] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => navigate(user ? "/subscription" : "/auth")}
                  >
                    {plan.price === "€0" ? "Get Started Free" : "Start Trial"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-[hsl(260,30%,6%)] to-background" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built by people who <span className="text-cosmic-glow">use it daily</span></h2>
            <p className="text-muted-foreground text-lg">Not a corporate team of 500. Just passionate builders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="animate-fade-in hover:scale-[1.02] hover:-translate-y-1 transition-transform duration-200"
                style={{ animationDelay: `${index * 100}ms` }}>
                <Card className="glass-cosmic border-0 h-full flex flex-col overflow-hidden group">
                  <CardContent className="relative pt-6 flex flex-col flex-1">
                    <p className="relative text-muted-foreground mb-6 leading-relaxed flex-1 text-sm">"{testimonial.content}"</p>
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

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
            Ready to ditch the <span className="text-cosmic-glow">corporate bloat</span>?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 animate-fade-in">
            Join the teams who chose simplicity over complexity. Free forever for small groups.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <SparklingButton onClick={() => navigate(user ? "/dashboard" : "/auth")} variant="cosmic" className="text-lg h-14 px-10">
              <Zap className="w-5 h-5" /> Start Free Now
            </SparklingButton>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 md:py-16 px-6 border-t border-border/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-6">Have questions? We actually reply to emails.</p>
          <a href="mailto:info.auradesk@gmail.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors">
            <Mail className="w-5 h-5" /> info.auradesk@gmail.com
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 px-6 glass-cosmic border-t-0">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <span className="text-xl font-bold text-cosmic">AuraDesk</span>
              <span className="text-muted-foreground text-sm">© 2026 All rights reserved.</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <a href="mailto:info.auradesk@gmail.com" className="text-sm text-muted-foreground hover:text-cosmic transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" /> info.auradesk@gmail.com
              </a>
              <div className="flex items-center gap-4">
                <UserGuideDownload variant="link" />
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-cosmic transition-colors">Terms</Link>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-cosmic transition-colors">Privacy</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* iOS Instructions */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md" aria-describedby="ios-install-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> Install AuraDesk on iOS</DialogTitle>
          </DialogHeader>
          <div id="ios-install-description" className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">Install as a web app for a native experience.</p>
            <div className="space-y-3">
              {["Open auradesk.lovable.app in Safari", "Tap the Share button (square with arrow)", 'Scroll down and tap "Add to Home Screen"', "Tap Add to install"].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">{i + 1}</div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Android Instructions */}
      <Dialog open={showAndroidInstructions} onOpenChange={setShowAndroidInstructions}>
        <DialogContent className="sm:max-w-md" aria-describedby="android-install-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> Install AuraDesk on Android</DialogTitle>
          </DialogHeader>
          <div id="android-install-description" className="space-y-4 pt-4">
            <p className="text-muted-foreground text-sm">Install as a web app for a native experience.</p>
            <div className="space-y-3">
              {["Open auradesk.lovable.app in Chrome", "Tap the menu button (three dots)", 'Tap "Install app" or "Add to Home screen"', "Tap Install to confirm"].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">{i + 1}</div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;
