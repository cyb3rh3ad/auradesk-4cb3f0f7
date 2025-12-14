import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { HelpNotification } from "@/components/HelpNotification";
import { OwnerInitializer } from "@/components/OwnerInitializer";
import { supabase } from "@/integrations/supabase/client";
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
import NotFound from "./pages/NotFound";

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

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ 
          duration: 0.25, 
          ease: [0.4, 0, 0.2, 1]
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeInit />
          <OwnerInitializer />
          <HelpNotification />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
              <ProtectedRoute>
                  <CallProvider>
                    <div className="flex h-screen w-full overflow-hidden">
                      <Sidebar />
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <Header />
                        <main className="flex-1 overflow-auto">
                          <PageTransition>
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
                          </PageTransition>
                        </main>
                      </div>
                    </div>
                  </CallProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
