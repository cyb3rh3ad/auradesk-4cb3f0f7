import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavBar } from "@/components/MobileNavBar";
import { Header } from "@/components/Header";
import { HelpNotification } from "@/components/HelpNotification";
import { OwnerInitializer } from "@/components/OwnerInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { PushNotificationInit } from "@/components/PushNotificationInit";
import { UpdateDialog } from "@/components/UpdateDialog";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { supabase } from "@/integrations/supabase/client";
import { isElectronApp } from "@/hooks/useIsElectron";
import { useIsMobile } from "@/hooks/use-mobile";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Teams from "./pages/Teams";
import Meetings from "./pages/Meetings";
import Files from "./pages/Files";
import AI from "./pages/AI";
import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";
import AISettings from "./pages/AISettings";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

// Component to handle root route - redirect Electron users to auth
const RootRoute = () => {
  const { user, loading } = useAuth();
  const isElectron = isElectronApp();
  
  // If Electron app, skip landing page entirely
  if (isElectron) {
    if (loading) return null;
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
  }
  
  // Web users see the landing page
  return <Landing />;
};

// Always use HashRouter - works with both web and Electron (file:// protocol)

const ThemeInit = () => {
  const { user } = useAuth();
  useEffect(() => {
    const apply = (themeName: string) => {
      const root = document.documentElement;
      const themes = ['dark', 'theme-discord-dark', 'theme-midnight', 'theme-forest', 'theme-sunset', 'theme-purple'];
      // Only remove and add if different from current to prevent flash
      const currentHasTheme = themes.some(t => root.classList.contains(t));
      const targetTheme = themeName && themeName !== 'light' ? themeName : null;
      
      if (!targetTheme && !currentHasTheme) return; // Already in light mode
      if (targetTheme && root.classList.contains(targetTheme)) return; // Already has the right theme
      
      themes.forEach(t => root.classList.remove(t));
      if (targetTheme) root.classList.add(targetTheme);
    };
    const load = async () => {
      if (!user) {
        apply('light');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single();
      apply(data?.theme || 'light');
    };
    load();
  }, [user?.id]);
  return null;
};

const queryClient = new QueryClient();

import { PageTransition } from "@/components/PageTransition";

const PageTransitionWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition>
        {children}
      </PageTransition>
    </AnimatePresence>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {!isMobile && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isElectronApp() && <div className="h-8 flex-shrink-0" />}
        <Header />
        <main className={cn("flex-1 overflow-auto", isMobile && "pb-16")}>
          <PageTransitionWrapper>
            {children}
          </PageTransitionWrapper>
        </main>
      </div>
      {isMobile && <MobileNavBar />}
    </div>
  );
};

// Utility for className concatenation
const cn = (...classes: (string | boolean | undefined)[]) => 
  classes.filter(Boolean).join(' ');

// Check if we should show splash (native mobile OR standalone PWA)
const shouldShowSplash = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Native Capacitor app
  const capacitor = (window as any).Capacitor;
  const isNative = capacitor?.isNativePlatform?.() ?? false;
  
  // Standalone PWA (installed to home screen)
  const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
  
  // Electron is excluded - has its own loading
  const isElectron = !!(window as any).electronAPI?.isElectron || window.location.protocol === 'file:';
  
  return (isNative || isStandalonePWA) && !isElectron;
};

const AppUpdateChecker = () => {
  const { updateAvailable, updateInfo, dismissUpdate, openDownload } = useAppUpdate();
  
  if (!updateAvailable || !updateInfo) return null;
  
  return (
    <UpdateDialog
      open={updateAvailable}
      onOpenChange={(open) => !open && dismissUpdate()}
      currentVersion={updateInfo.currentVersion}
      latestVersion={updateInfo.latestVersion}
      releaseNotes={updateInfo.releaseNotes}
      publishedAt={updateInfo.publishedAt}
      onDownload={openDownload}
      onDismiss={dismissUpdate}
    />
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {showSplash && (
            <SplashScreen onComplete={() => setShowSplash(false)} />
          )}
          <Toaster />
          <Sonner />
          <AppUpdateChecker />
          <HashRouter>
            <AuthProvider>
              <ThemeInit />
              <OwnerInitializer />
              <HelpNotification />
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route
                  path="/*"
                  element={
                  <ProtectedRoute>
                      <OnboardingCheck />
                      <PushNotificationInit />
                      <CallProvider>
                        <AppLayout>
                          <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/teams" element={<Teams />} />
                            <Route path="/meetings" element={<Meetings />} />
                            <Route path="/files" element={<Files />} />
                            <Route path="/ai" element={<AI />} />
                            <Route path="/ai-settings" element={<AISettings />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/subscription" element={<Subscription />} />
                            <Route path="/admin" element={<Admin />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </AppLayout>
                      </CallProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
