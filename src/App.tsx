import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { HelpNotification } from "@/components/HelpNotification";
import { supabase } from "@/integrations/supabase/client";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Teams from "./pages/Teams";
import Meetings from "./pages/Meetings";
import Files from "./pages/Files";
import AI from "./pages/AI";
import Settings from "./pages/Settings";
import AISettings from "./pages/AISettings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const ThemeInit = () => {
  const { user } = useAuth();
  useEffect(() => {
    const apply = (themeName: string) => {
      const root = document.documentElement;
      root.classList.remove(
        'dark',
        'theme-discord-dark',
        'theme-midnight',
        'theme-forest',
        'theme-sunset',
        'theme-purple'
      );
      if (themeName && themeName !== 'light') {
        root.classList.add(themeName);
      }
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeInit />
          <HelpNotification />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen w-full overflow-hidden">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <Header />
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/chat" element={<Chat />} />
                          <Route path="/teams" element={<Teams />} />
                          <Route path="/meetings" element={<Meetings />} />
                          <Route path="/files" element={<Files />} />
                          <Route path="/ai" element={<AI />} />
                          <Route path="/ai-settings" element={<AISettings />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
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
