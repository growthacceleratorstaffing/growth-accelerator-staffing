import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import JobDetail from "./pages/JobDetail";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import Matches from "./pages/Matches";
import PostJob from "./pages/PostJob";
import ApplyJob from "./pages/ApplyJob";
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
            <Route path="/auth" element={<Auth />} />
            
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
            <Route path="/jobs/:jobId" element={
              <ProtectedRoute>
                <Navigation />
                <JobDetail />
              </ProtectedRoute>
            } />
            <Route path="/jobs/:jobId/apply" element={
              <ProtectedRoute>
                <Navigation />
                <ApplyJob />
              </ProtectedRoute>
            } />
            <Route path="/candidates" element={
              <ProtectedRoute requiredRole="recruiter">
                <Navigation />
                <Candidates />
              </ProtectedRoute>
            } />
            <Route path="/matches" element={
              <ProtectedRoute requiredRole="recruiter">
                <Navigation />
                <Matches />
              </ProtectedRoute>
            } />
            <Route path="/post-job" element={
              <ProtectedRoute requiredRole="admin">
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
