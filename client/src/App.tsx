import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { Header } from "@/components/Header";
import Home from "@/pages/Home";
import ForumPage from "@/pages/ForumPage";
import ChatPage from "@/pages/ChatPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/forum" component={ForumPage} />
      <Route path="/chat" component={ChatPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="forum-chat-theme">
        <AuthProvider>
          <WebSocketProvider>
            <TooltipProvider>
              <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <Header />
                <main className="flex-1">
                  <Router />
                </main>
                <Toaster />
              </div>
            </TooltipProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
