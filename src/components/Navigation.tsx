import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, LogOut, UserCheck, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, profile, signOut, canAccessJobs, canViewCandidates, canPostJobs } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  const handleOnboardingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open("https://www.contractdossier.nl", "_blank");
  };
  
  return (
    <nav className="border-b bg-background shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-12">
            <Link to="/" className="flex items-center space-x-3 mr-8">
              <img 
                src="/lovable-uploads/b703692d-f11f-419a-a31b-7c24887ef1b9.png" 
                alt="Growth Accelerator" 
                className="h-12 w-12"
              />
              <span className="font-bold text-2xl text-primary">Growth Accelerator</span>
            </Link>
            
            <div className="flex items-center space-x-2">
              <Link to="/dashboard">
                <Button 
                  variant="default" 
                  className="flex items-center gap-2 h-12 px-6 text-base"
                >
                  <Briefcase className="h-5 w-5" />
                  Dashboard
                </Button>
              </Link>
              
              <Link to="/jobs">
                <Button 
                  variant="default"
                  className="flex items-center gap-2 h-12 px-6 text-base"
                >
                  <Briefcase className="h-5 w-5" />
                  Jobs
                </Button>
              </Link>
              
              <Link to="/candidates">
                <Button 
                  variant="default"
                  className="flex items-center gap-2 h-12 px-6 text-base"
                >
                  <User className="h-5 w-5" />
                  Candidates
                </Button>
              </Link>
              
              <Link to="/applications">
                <Button 
                  variant="default"
                  className="flex items-center gap-2 h-12 px-6 text-base"
                >
                  <User className="h-5 w-5" />
                  Talent Pool
                </Button>
              </Link>
              
              <Link to="/matches">
                <Button 
                  variant="default"
                  className="flex items-center gap-2 h-12 px-6 text-base"
                >
                  <UserCheck className="h-5 w-5" />
                  Matches
                </Button>
              </Link>
              
              <Button 
                variant="default"
                className="flex items-center gap-2 h-12 px-6 text-base"
                onClick={handleOnboardingClick}
              >
                <Settings className="h-5 w-5" />
                Onboarding
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                  <User className="h-4 w-4" />
                  <span className="text-sm">
                    {profile?.full_name || profile?.email || 'User'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {profile?.role || 'viewer'}
                  </Badge>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button 
                  variant="default" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;