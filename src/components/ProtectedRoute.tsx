import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'recruiter' | 'viewer';
}

const ProtectedRoute = ({ children, requiredRole = 'viewer' }: ProtectedRouteProps) => {
  const { isAuthenticated, hasRole, loading, profile, user } = useAuth();

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

  // Debug logging
  console.log('ProtectedRoute debug:', {
    isAuthenticated,
    user: user?.email,
    profile: profile?.role,
    requiredRole,
    hasRoleResult: hasRole(requiredRole)
  });

  // For now, allow access if authenticated (bypass role checking temporarily)
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Fallback access denied
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          User: {user?.email}<br/>
          Profile Role: {profile?.role || 'No profile'}<br/>
          Required Role: {requiredRole}
        </p>
        <p className="text-muted-foreground">Please contact an administrator for access.</p>
      </div>
    </div>
  );
};

export default ProtectedRoute;