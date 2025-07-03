import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import Matches from "./pages/Matches";
import PostJob from "./pages/PostJob";
import ApplyJob from "./pages/ApplyJob";
import AuthLogin from "./pages/AuthLogin";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<><Navigation /><Landing /></>} />
            <Route path="/auth/login" element={<><Navigation /><AuthLogin /></>} />
            <Route path="/auth/callback" element={<><Navigation /><AuthCallback /></>} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Navigation />
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/jobs" element={
              <ProtectedRoute>
                <Navigation />
                <Jobs />
              </ProtectedRoute>
            } />
            <Route path="/jobs/:jobId/apply" element={
              <ProtectedRoute>
                <Navigation />
                <ApplyJob />
              </ProtectedRoute>
            } />
            <Route path="/candidates" element={
              <ProtectedRoute>
                <Navigation />
                <Candidates />
              </ProtectedRoute>
            } />
            <Route path="/matches" element={
              <ProtectedRoute>
                <Navigation />
                <Matches />
              </ProtectedRoute>
            } />
            <Route path="/post-job" element={
              <ProtectedRoute>
                <Navigation />
                <PostJob />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<><Navigation /><NotFound /></>} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
