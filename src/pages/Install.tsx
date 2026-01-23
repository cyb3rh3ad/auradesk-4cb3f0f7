import { Button } from "@/components/ui/button";
import { 
  Download, 
  Smartphone, 
  Check, 
  ArrowRight,
  Apple,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const Install = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, installPWA } = usePWAInstall();

  const handleInstall = async () => {
    await installPWA();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <span 
            className="text-xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            AuraDesk
          </span>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </nav>

      {/* Main Content - Centered */}
      <section className="flex-1 flex items-center justify-center px-6 pt-20 pb-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-8"
          >
            {/* Icon */}
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/30"
            >
              <Smartphone className="w-12 h-12 text-white" />
            </motion.div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">
                Install AuraDesk
              </h1>
              <p className="text-muted-foreground">
                Get the full app experience on your device
              </p>
            </div>

            {/* Already Installed State */}
            {isInstalled && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 p-6 rounded-2xl bg-green-500/10 border border-green-500/30"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-500">Already Installed!</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Open AuraDesk from your home screen
                  </p>
                </div>
                <Button 
                  size="lg" 
                  className="w-full rounded-full"
                  onClick={() => navigate("/dashboard")}
                >
                  Open App <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Installable State (Android/Desktop Chrome) */}
            {isInstallable && !isInstalled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <Button 
                  size="lg" 
                  onClick={handleInstall}
                  className="w-full h-14 text-lg rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/30"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Install Now
                </Button>
                <p className="text-xs text-muted-foreground">
                  One tap install • No app store needed
                </p>
              </motion.div>
            )}

            {/* iOS Instructions (simplified) */}
            {isIOS && !isInstalled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Apple className="w-5 h-5" />
                    <span className="font-medium">iPhone / iPad</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-background">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        1
                      </div>
                      <span className="text-left">Tap the <strong>Share</strong> button below</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-background">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        2
                      </div>
                      <span className="text-left">Select <strong>"Add to Home Screen"</strong></span>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Safari required for iOS installation
                </p>
              </motion.div>
            )}

            {/* Fallback for unsupported browsers */}
            {!isInstallable && !isIOS && !isInstalled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 space-y-4">
                  <p className="text-muted-foreground">
                    Use <strong>Chrome</strong> or <strong>Safari</strong> for the best install experience
                  </p>
                </div>
                
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full h-14 text-lg rounded-full"
                  onClick={() => navigate("/auth")}
                >
                  Continue in Browser
                </Button>
              </motion.div>
            )}

            {/* Benefits - compact */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center gap-6 pt-4 text-muted-foreground text-sm"
            >
              <span>⚡ Fast</span>
              <span>📴 Offline</span>
              <span>🔔 Notifications</span>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Install;
