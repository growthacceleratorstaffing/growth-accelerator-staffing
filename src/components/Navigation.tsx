import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, LogOut, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, profile, signOut, canAccessJobs, canViewCandidates, canPostJobs } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <Briefcase className="h-6 w-6" />
              <span className="font-bold text-xl">Startup Accelerator</span>
            </Link>
            
            <div className="flex items-center space-x-1">
              {isAuthenticated && (
                <>
                  <Link to="/dashboard">
                    <Button 
                      variant={isActive("/dashboard") ? "default" : "ghost"} 
                      className="flex items-center gap-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  
                  {canAccessJobs() && (
                    <Link to="/jobs">
                      <Button 
                        variant={isActive("/jobs") ? "default" : "ghost"}
                        className="flex items-center gap-2"
                      >
                        <Briefcase className="h-4 w-4" />
                        Jobs
                        <Badge variant="secondary">23</Badge>
                      </Button>
                    </Link>
                  )}
                  
                  {canViewCandidates() && (
                    <Link to="/candidates">
                      <Button 
                        variant={isActive("/candidates") ? "default" : "ghost"}
                        className="flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Candidates
                        <Badge variant="secondary">156</Badge>
                      </Button>
                    </Link>
                  )}
                  
                  <Link to="/matches">
                    <Button 
                      variant={isActive("/matches") ? "default" : "ghost"}
                      className="flex items-center gap-2"
                    >
                      <UserCheck className="h-4 w-4" />
                      Matches
                      <Badge variant="secondary">12</Badge>
                    </Button>
                  </Link>
                </>
              )}
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