import { Button } from "@/components/ui/button";
import { 
  Download, 
  Smartphone, 
  Check, 
  ArrowLeft,
  Share2,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const Install = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();

  const handleInstall = async () => {
    await installPWA();
  };

  // Detect platform for highlighting
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

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
          <div className="w-16" />
        </div>
      </nav>

      {/* Main Content */}
      <section className="flex-1 flex items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-sm">
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
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/25"
            >
              <Smartphone className="w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Install AuraDesk</h1>
              <p className="text-muted-foreground text-sm">Add to your home screen for the best experience</p>
            </div>

            {/* Already Installed */}
            {isInstalled && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-green-500/10 border border-green-500/30 space-y-3"
              >
                <Check className="w-10 h-10 text-green-500 mx-auto" />
                <p className="font-semibold text-green-500">Already Installed!</p>
                <Button 
                  className="w-full rounded-full"
                  onClick={() => navigate("/dashboard")}
                >
                  Open App
                </Button>
              </motion.div>
            )}

            {/* Install Options - Always show both */}
            {!isInstalled && (
              <div className="space-y-4">
                {/* One-tap install if available */}
                {isInstallable && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button 
                      size="lg" 
                      onClick={handleInstall}
                      className="w-full h-14 text-base rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/25"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Install Now
                    </Button>
                  </motion.div>
                )}

                {/* iPhone Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`p-4 rounded-xl border ${isIOS ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                      <span className="text-white text-lg"></span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">iPhone / iPad</p>
                      <p className="text-xs text-muted-foreground">Safari browser</p>
                    </div>
                    {isIOS && <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Your device</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background rounded-lg p-3">
                    <span>Tap</span>
                    <Share2 className="w-4 h-4 text-primary" />
                    <span>then</span>
                    <span className="font-medium text-foreground">"Add to Home Screen"</span>
                  </div>
                </motion.div>

                {/* Android Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`p-4 rounded-xl border ${isAndroid ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <span className="text-white text-lg">🤖</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Android</p>
                      <p className="text-xs text-muted-foreground">Chrome browser</p>
                    </div>
                    {isAndroid && <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Your device</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background rounded-lg p-3">
                    <span>Tap</span>
                    <MoreVertical className="w-4 h-4 text-primary" />
                    <span>then</span>
                    <span className="font-medium text-foreground">"Install app"</span>
                  </div>
                </motion.div>

                {/* Skip option */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    onClick={() => navigate("/auth")}
                  >
                    Skip, continue in browser →
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center gap-4 text-xs text-muted-foreground"
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
