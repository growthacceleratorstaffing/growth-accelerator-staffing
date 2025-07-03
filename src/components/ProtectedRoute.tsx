import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'recruiter' | 'viewer';
  requiredScope?: 'read' | 'write' | 'read_candidate' | 'write_candidate' | 'read_company' | 'write_company' | 'read_contact' | 'write_contact' | 'read_jobad' | 'write_jobad' | 'read_jobapplication' | 'write_jobapplication' | 'read_job' | 'write_job' | 'read_placement' | 'write_placement' | 'read_user' | 'partner_jobboard' | 'offline_access';
  customCheck?: () => boolean;
}

const ProtectedRoute = ({ children, requiredRole = 'viewer', requiredScope, customCheck }: ProtectedRouteProps) => {
  const { isAuthenticated, hasRole, hasJobAdderScope, loading, profile } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
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

  // Check permissions
  let hasPermission = hasRole(requiredRole);
  
  if (requiredScope) {
    hasPermission = hasPermission && hasJobAdderScope(requiredScope);
  }
  
  if (customCheck) {
    hasPermission = hasPermission && customCheck();
  }

  if (!hasPermission) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Your role: {profile?.role || 'No profile'}<br/>
            Required role: {requiredRole}<br/>
            {requiredScope && `Required scope: ${requiredScope}`}
          </p>
        </div>
      </div>
    );
  }

  // Render protected content if authenticated and has required role
  return <>{children}</>;
};

export default ProtectedRoute;