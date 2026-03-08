import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { GlobalCallOverlay } from "@/components/call/GlobalCallOverlay";
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
import { PWAUpdateHandler } from "@/components/PWAUpdateHandler";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { CommandPalette } from "@/components/CommandPalette";
import { supabase } from "@/integrations/supabase/client";
import { isElectronApp } from "@/hooks/useIsElectron";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";

// Eagerly loaded (critical path)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

// Lazy loaded (behind auth wall)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Teams = lazy(() => import("./pages/Teams"));
const Meetings = lazy(() => import("./pages/Meetings"));
const Files = lazy(() => import("./pages/Files"));
const AI = lazy(() => import("./pages/AI"));
const Settings = lazy(() => import("./pages/Settings"));
const Subscription = lazy(() => import("./pages/Subscription"));
const AISettings = lazy(() => import("./pages/AISettings"));
const Admin = lazy(() => import("./pages/Admin"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ElectronCall = lazy(() => import("./pages/ElectronCall"));
const FocusRoom = lazy(() => import("./pages/FocusRoom"));
const AuraVille = lazy(() => import("./pages/AuraVille"));

// Route loading fallback
const RouteLoader = () => (
  <div className="flex items-center justify-center h-full w-full">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Check if running as a native app or standalone PWA (skip landing page)
const isStandaloneApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const capacitor = (window as any).Capacitor;
  const isNative = capacitor?.isNativePlatform?.() ?? false;
  const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches ||
                          window.matchMedia('(display-mode: fullscreen)').matches ||
                          (window.navigator as any).standalone === true;
  const isElectron = !!(window as any).electronAPI?.isElectron || window.location.protocol === 'file:';
  
  let wasStandalone = false;
  try {
    wasStandalone = localStorage.getItem('auradesk-is-standalone') === 'true';
  } catch (e) {}
  
  const result = isNative || isStandalonePWA || isElectron || wasStandalone;
  
  if (result && !wasStandalone) {
    try { localStorage.setItem('auradesk-is-standalone', 'true'); } catch (e) {}
  }
  
  return result;
};

const RootRoute = () => {
  const { user, loading } = useAuth();
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneApp());
  
  useEffect(() => {
    const checkNow = isStandaloneApp();
    if (checkNow !== isStandalone) setIsStandalone(checkNow);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
    
    const handleChange = () => {
      if (mediaQuery.matches || fullscreenQuery.matches) {
        setIsStandalone(true);
        try { localStorage.setItem('auradesk-is-standalone', 'true'); } catch (e) {}
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    fullscreenQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      fullscreenQuery.removeEventListener('change', handleChange);
    };
  }, [isStandalone]);
  
  if (isStandalone) {
    if (loading) return null;
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
  }
  
  return <Landing />;
};

const ThemeInit = () => {
  const { user } = useAuth();
  useEffect(() => {
    const apply = (themeName: string) => {
      const root = document.documentElement;
      const themes = ['dark', 'theme-discord-dark', 'theme-midnight', 'theme-forest', 'theme-sunset', 'theme-purple'];
      const currentHasTheme = themes.some(t => root.classList.contains(t));
      const targetTheme = themeName && themeName !== 'light' ? themeName : null;
      
      if (!targetTheme && !currentHasTheme) return;
      if (targetTheme && root.classList.contains(targetTheme)) return;
      
      themes.forEach(t => root.classList.remove(t));
      if (targetTheme) root.classList.add(targetTheme);
      
      try { localStorage.setItem('auradesk-theme', themeName); } catch (e) {}
    };
    const load = async () => {
      if (!user) {
        try {
          const saved = localStorage.getItem('auradesk-theme');
          if (saved) { apply(saved); return; }
        } catch (e) {}
        apply('dark');
        return;
      }
      const { data } = await supabase.from('profiles').select('theme').eq('id', user.id).single();
      apply(data?.theme || 'dark');
    };
    load();
  }, [user?.id]);
  return null;
};

const queryClient = new QueryClient();

import { PageTransition } from "@/components/PageTransition";
import { memo } from "react";

const PageTransitionWrapper = memo(({ children }: { children: React.ReactNode }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <PageTransition>{children}</PageTransition>
  </AnimatePresence>
));

const AppLayout = memo(({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const isElectron = isElectronApp();
  const location = useLocation();
  
  const selfManagedPages = ['/chat', '/teams', '/ai', '/focus', '/auraville'];
  const isSelfManagedPage = selfManagedPages.some(p => location.pathname.startsWith(p));
  
  return (
    <div className="flex w-full h-full overflow-hidden" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
      {!isMobile && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 h-full">
        {isElectron && <div className="h-8 flex-shrink-0" />}
        <Header />
        <main
          className={`flex-1 min-h-0 relative ${isSelfManagedPage ? "overflow-hidden" : "overflow-auto"}`}
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        {isMobile && <MobileNavBar />}
      </div>
    </div>
  );
});

const shouldShowSplash = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hash = window.location.hash;
  const search = window.location.search;
  const isOAuthCallback = hash.includes('access_token') || hash.includes('refresh_token') ||
                          search.includes('code=') || sessionStorage.getItem('oauth_login_pending') === 'true';
  if (isOAuthCallback) return false;
  
  const capacitor = (window as any).Capacitor;
  const isNative = capacitor?.isNativePlatform?.() ?? false;
  const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
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
          {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
          <Toaster />
          <Sonner />
          <AppUpdateChecker />
          <PWAUpdateHandler />
          <HashRouter>
            <AuthProvider>
              <ThemeInit />
              <OwnerInitializer />
              <HelpNotification />
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/terms" element={<Suspense fallback={<RouteLoader />}><Terms /></Suspense>} />
                <Route path="/privacy" element={<Suspense fallback={<RouteLoader />}><Privacy /></Suspense>} />
                <Route path="/electron-call" element={<Suspense fallback={<RouteLoader />}><ElectronCall /></Suspense>} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <OnboardingCheck />
                      <PushNotificationInit />
                      <PresenceProvider>
                        <CallProvider>
                          <GlobalCallOverlay />
                          <CommandPalette />
                          <AppLayout>
                            <Suspense fallback={<RouteLoader />}>
                              <Routes>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/chat" element={<Chat />} />
                                <Route path="/teams" element={<Teams />} />
                                <Route path="/meetings" element={<Meetings />} />
                                <Route path="/files" element={<Files />} />
                                <Route path="/ai" element={<AI />} />
                                <Route path="/ai-settings" element={<AISettings />} />
                                <Route path="/focus" element={<FocusRoom />} />
                                <Route path="/auraville" element={<AuraVille />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/subscription" element={<Subscription />} />
                                <Route path="/admin" element={<Admin />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </Suspense>
                          </AppLayout>
                        </CallProvider>
                      </PresenceProvider>
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
