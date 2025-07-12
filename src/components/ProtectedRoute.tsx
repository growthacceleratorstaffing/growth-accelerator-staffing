import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/providers/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'recruiter' | 'viewer';
  requiredScope?: 'read' | 'write' | 'read_candidate' | 'write_candidate' | 'read_company' | 'write_company' | 'read_contact' | 'write_contact' | 'read_jobad' | 'write_jobad' | 'read_jobapplication' | 'write_jobapplication' | 'read_job' | 'write_job' | 'read_placement' | 'write_placement' | 'read_user' | 'partner_jobboard' | 'offline_access';
  customCheck?: () => boolean;
}

const ProtectedRoute = ({ children, requiredRole = 'viewer', requiredScope, customCheck }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, profile } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // For now, allow all authenticated users (remove role/scope checking temporarily)
  // This can be re-implemented later with proper permission system
  
  // Check custom permissions if provided
  if (customCheck && !customCheck()) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Render protected content if authenticated and has required role
  return <>{children}</>;
};

export default ProtectedRoute;