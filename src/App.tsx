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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Jobs from "./pages/Jobs";
import Applications from "./pages/Applications";
import Candidates from "./pages/Candidates";
import Matches from "./pages/Matches";
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
            <Route path="/privacy" element={<><Navigation /><PrivacyPolicy /></>} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Navigation />
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/jobs" element={
              <ProtectedRoute requiredScope="read_job">
                <Navigation />
                <Jobs />
              </ProtectedRoute>
            } />
            <Route path="/jobs/:jobId" element={
              <ProtectedRoute requiredScope="read_job">
                <Navigation />
                <JobDetail />
              </ProtectedRoute>
            } />
            <Route path="/jobs/:jobId/apply" element={
              <ProtectedRoute requiredScope="read_jobapplication">
                <Navigation />
                <ApplyJob />
              </ProtectedRoute>
            } />
            <Route path="/applications" element={
              <ProtectedRoute requiredScope="read_jobapplication">
                <Navigation />
                <Applications />
              </ProtectedRoute>
            } />
            <Route path="/candidates" element={
              <ProtectedRoute requiredScope="read_candidate">
                <Navigation />
                <Candidates />
              </ProtectedRoute>
            } />
            <Route path="/matches" element={
              <ProtectedRoute requiredScope="read_placement">
                <Navigation />
                <Matches />
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
