import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  Check, 
  ArrowRight,
  Monitor,
  Apple,
  Chrome
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const Install = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, installPWA } = usePWAInstall();

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      // Optionally redirect to dashboard after install
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <span 
            className="text-2xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            AuraDesk
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <section className="pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6 mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Smartphone className="w-4 h-4" />
              Install AuraDesk
            </div>

            <h1 className="text-4xl md:text-5xl font-bold">
              Get AuraDesk on your{" "}
              <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                device
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Install AuraDesk directly to your home screen for the best experience. 
              Works offline, launches instantly, and feels just like a native app.
            </p>
          </motion.div>

          {/* Already Installed */}
          {isInstalled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-green-500 mb-2">Already Installed!</h3>
                  <p className="text-muted-foreground mb-4">
                    AuraDesk is already installed on your device. Open it from your home screen.
                  </p>
                  <Button onClick={() => navigate("/dashboard")}>
                    Open AuraDesk <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Install Button (Chrome/Edge on Android/Desktop) */}
          {isInstallable && !isInstalled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-primary/30">
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Download className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Install Now</h3>
                  <p className="text-muted-foreground mb-6">
                    Click the button below to install AuraDesk on your device.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={handleInstall}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Install AuraDesk
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Installation Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* iOS Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className={`h-full ${isIOS ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <Apple className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">iPhone & iPad</h3>
                      <p className="text-sm text-muted-foreground">Safari browser</p>
                    </div>
                  </div>
                  
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                      <span>Open AuraDesk in <strong>Safari</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                      <span className="flex items-center gap-1">
                        Tap the <Share className="w-4 h-4 inline" /> Share button
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                      <span className="flex items-center gap-1">
                        Tap <PlusSquare className="w-4 h-4 inline" /> "Add to Home Screen"
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                      <span>Tap "Add" to confirm</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </motion.div>

            {/* Android Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Android</h3>
                      <p className="text-sm text-muted-foreground">Chrome browser</p>
                    </div>
                  </div>
                  
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                      <span>Open AuraDesk in <strong>Chrome</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                      <span>Tap the ⋮ menu button</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                      <span>Tap "Install app" or "Add to Home screen"</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                      <span>Tap "Install" to confirm</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </motion.div>

            {/* Desktop Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Desktop (Windows, Mac, Linux)</h3>
                      <p className="text-sm text-muted-foreground">Chrome, Edge, or Brave browser</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-6">
                    <ol className="space-y-3 text-sm flex-1 min-w-[200px]">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                        <span>Look for the install icon in the address bar</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                        <span>Click "Install" when prompted</span>
                      </li>
                    </ol>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Chrome className="w-5 h-5" />
                      <span>Works best with Chrome</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <h3 className="text-xl font-bold mb-6">Why install?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: "⚡", label: "Instant launch" },
                { icon: "📴", label: "Works offline" },
                { icon: "🔔", label: "Push notifications" },
                { icon: "💾", label: "No app store needed" },
              ].map((benefit, index) => (
                <div key={index} className="p-4 rounded-xl bg-muted/50">
                  <div className="text-2xl mb-2">{benefit.icon}</div>
                  <p className="text-sm font-medium">{benefit.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <Button variant="outline" onClick={() => navigate("/")}>
              ← Back to Home
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Install;
