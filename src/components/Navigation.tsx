import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Plus, Home, Shield, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import oauth2Manager from "@/lib/oauth2-manager";

const Navigation = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(oauth2Manager.isAuthenticated());
    };
    
    checkAuth();
    const interval = setInterval(checkAuth, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);
  
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
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  
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
                  
                  <Link to="/candidates">
                    <Button 
                      variant={isActive("/candidates") ? "default" : "ghost"}
                      className="flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Candidates
                      <Badge variant="secondary">156</Badge>
                    </Button>
                  </Link>
                  
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
                <Button 
                  variant="default" 
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    oauth2Manager.clearTokens();
                    window.location.href = '/';
                  }}
                >
                  <Shield className="h-4 w-4" />
                  Disconnect
                </Button>
                
                <Link to="/post-job">
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Post Job
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/auth/login">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Connect with JobAdder
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