import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense, memo } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavBar } from "@/components/MobileNavBar";
import { Header } from "@/components/Header";
import { HelpNotification } from "@/components/HelpNotification";
import { OwnerInitializer } from "@/components/OwnerInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingCheck } from "@/components/OnboardingCheck";
import { PushNotificationInit } from "@/components/PushNotificationInit";
import { UpdateNotification } from "@/components/UpdateNotification";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import { supabase } from "@/integrations/supabase/client";
import { isElectronApp } from "@/hooks/useIsElectron";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";

// Lazy load heavy pages for better initial load performance
const Landing = lazy(() => import("./pages/Landing"));
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
const Auth = lazy(() => import("./pages/Auth"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = memo(() => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
));
PageLoader.displayName = 'PageLoader';

// Detect if running as installed PWA (standalone mode)
const isPWAInstalled = () => {
  // Check for standalone display mode (Android Chrome, iOS Safari)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari specific check
  const isIOSStandalone = (navigator as any).standalone === true;
  return isStandalone || isIOSStandalone;
};

// Check if we're returning from OAuth (session was just set by main.tsx)
const isReturningFromOAuth = () => {
  const pending = sessionStorage.getItem('oauth_login_pending');
  const loginTime = sessionStorage.getItem('oauth_login_time');
  
  if (pending === 'true' && loginTime) {
    const elapsed = Date.now() - parseInt(loginTime, 10);
    // Consider it a fresh OAuth return if within last 10 seconds
    return elapsed < 10000;
  }
  return false;
};

// Component to handle root route - redirect Electron/PWA users to auth
const RootRoute = memo(() => {
  const { user, loading } = useAuth();
  const isElectron = isElectronApp();
  const isPWA = isPWAInstalled();
  const isOAuthReturn = isReturningFromOAuth();
  
  // If returning from OAuth, wait for auth to resolve then redirect
  if (isOAuthReturn) {
    if (loading) return <PageLoader />;
    // Redirect to dashboard if authenticated, otherwise back to auth
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
  }
  
  // If Electron app or installed PWA, skip landing page entirely
  if (isElectron || isPWA) {
    if (loading) return <PageLoader />;
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
  }
  
  // Web users see the landing page
  return <Landing />;
});
RootRoute.displayName = 'RootRoute';

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

// Simplified page transition - no AnimatePresence blocking to prevent freezing
const PageTransition = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
});
PageTransition.displayName = 'PageTransition';

// Layout wrapper component to use hooks
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {!isMobile && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isElectronApp() && <div className="h-8 flex-shrink-0" />}
        <Header />
        <main className={cn("flex-1 overflow-hidden", isMobile && "pb-16")}>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
      {isMobile && <MobileNavBar />}
    </div>
  );
};

// Utility for className concatenation
const cn = (...classes: (string | boolean | undefined)[]) => 
  classes.filter(Boolean).join(' ');

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdateNotification />
        <PWAUpdateNotification />
        <HashRouter>
          <AuthProvider>
            <ThemeInit />
            <OwnerInitializer />
            <HelpNotification />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/install" element={<Install />} />
                <Route
                  path="/*"
                  element={
                  <ProtectedRoute>
                      <OnboardingCheck />
                      <PushNotificationInit />
                      <PresenceProvider>
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
                      </PresenceProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </AuthProvider>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
