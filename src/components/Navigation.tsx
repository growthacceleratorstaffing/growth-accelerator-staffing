import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Plus, Home } from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <Briefcase className="h-6 w-6" />
              <span className="font-bold text-xl">JobPortal</span>
            </Link>
            
            <div className="flex items-center space-x-1">
              <Link to="/">
                <Button 
                  variant={isActive("/") ? "default" : "ghost"} 
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
            </div>
          </div>
          
          <Link to="/post-job">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Post Job
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;