import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, LogOut, UserCheck, Settings, ExternalLink, Download } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import PlatformChatbot from "./components/PlatformChatbot";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import JobDetail from "./pages/JobDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Jobs from "./pages/Jobs";
import JobPosting from "./pages/JobPosting";
import JobAdvertising from "./pages/JobAdvertising";
import Applications from "./pages/Applications";
import Candidates from "./pages/Candidates";
import Matches from "./pages/Matches";
import ApplyJob from "./pages/ApplyJob";
import PreOnboarding from "./pages/PreOnboarding";
import Onboarding from "./pages/Onboarding";
import JobBoard from "./pages/JobBoard";


import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";


const AppSidebar = () => {
  const location = useLocation();
  const { isAuthenticated, profile, signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  const handleOnboardingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open("https://mijn.cootje.com/recruiter/kandidaten/b50e2506-9644-40be-8e87-08b2046ca3ee?view=Vacatures&tab=Koppelen", "_blank");
  };

  const handleAdministrationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open("https://mijn.cootje.com/urenregistraties", "_blank");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link to="/" className="flex items-center space-x-3 p-4">
          <img 
            src="/lovable-uploads/b703692d-f11f-419a-a31b-7c24887ef1b9.png" 
            alt="Growth Accelerator" 
            className="h-8 w-8"
          />
          <span className="font-bold text-xl text-primary">Growth Accelerator</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard Section */}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")}>
                  <Link to="/">
                    <Settings className="h-4 w-4" />
                    <span className="text-white text-base">Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                  <Link to="/dashboard">
                    <Settings className="h-4 w-4" />
                    <span className="text-white text-base">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Jobs Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-pink-500 text-xl font-semibold">Jobs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/jobs")}>
                  <Link to="/jobs">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-white text-base">Vacancies</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/job-posting")}>
                  <Link to="/job-posting">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-base">Job Posting</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                 <SidebarMenuButton asChild isActive={isActive("/job-board")}>
                   <Link to="/job-board">
                     <User className="h-4 w-4" />
                     <span className="text-base">Career Page</span>
                   </Link>
                 </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Staffing Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-pink-500 text-xl font-semibold">Staffing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/applications")}>
                  <Link to="/applications">
                    <User className="h-4 w-4" />
                    <span className="text-base">Applicants</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/matches")}>
                  <Link to="/matches">
                    <UserCheck className="h-4 w-4" />
                    <span className="text-base">Matching</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/pre-onboarding")}>
                  <Link to="/pre-onboarding">
                    <Settings className="h-4 w-4" />
                    <span className="text-base">Preboarding</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Contracting Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-pink-500 text-xl font-semibold">Contracting</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild onClick={handleOnboardingClick}>
                  <button>
                    <Settings className="h-4 w-4" />
                    <span className="text-base">Onboarding</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild onClick={handleAdministrationClick}>
                  <button>
                    <Settings className="h-4 w-4" />
                    <span className="text-base">Backoffice</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Section */}
        <div className="mt-auto p-4">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                <User className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium truncate">
                    {profile?.full_name || profile?.email || 'User'}
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {profile?.role || 'viewer'}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full flex items-center gap-2 text-base"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button 
                variant="default" 
                size="sm"
                className="w-full flex items-center gap-2 text-base"
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

// Create QueryClient outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
        <Routes>
          {/* Authentication routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* Redirect old routes to main auth page */}
          
          <Route path="/auth/login" element={<Navigate to="/auth" replace />} />
          
          {/* Routes with sidebar */}
          <Route path="/" element={
            <AppLayout>
              <Landing />
            </AppLayout>
          } />
          <Route path="/privacy" element={
            <AppLayout>
              <PrivacyPolicy />
            </AppLayout>
          } />
          
          {/* Protected routes with sidebar */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <Index />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/jobs" element={
            <ProtectedRoute requiredScope="read_job">
              <AppLayout>
                <Jobs />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/job-posting" element={
            <ProtectedRoute requiredScope="write_job">
              <AppLayout>
                <JobPosting />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/jobs/:jobId" element={
            <ProtectedRoute requiredScope="read_job">
              <AppLayout>
                <JobDetail />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/jobs/:jobId/apply" element={
            <ProtectedRoute requiredScope="read_jobapplication">
              <AppLayout>
                <ApplyJob />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/applications" element={
            <ProtectedRoute requiredScope="read_jobapplication">
              <AppLayout>
                <Applications />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/candidates" element={
            <ProtectedRoute requiredScope="read_candidate">
              <AppLayout>
                <Candidates />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/matches" element={
            <ProtectedRoute requiredScope="read_placement">
              <AppLayout>
                <Matches />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/pre-onboarding" element={
            <ProtectedRoute>
              <AppLayout>
                <PreOnboarding />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <AppLayout>
                <Onboarding />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/job-board" element={
            <AppLayout>
              <JobBoard />
            </AppLayout>
          } />
          
          {/* Catch-all route */}
          <Route path="*" element={
            <AppLayout>
              <NotFound />
            </AppLayout>
          } />
        </Routes>
            <PlatformChatbot />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
