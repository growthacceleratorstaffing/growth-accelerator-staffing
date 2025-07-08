import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import oauth2Manager from "@/lib/oauth2-manager";
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Shield, Clock, RefreshCw, User, Building } from 'lucide-react';

const AuthLogin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await oauth2Manager.isAuthenticated();
      const info = oauth2Manager.getAccountInfo();
      
      setIsAuthenticated(authenticated);
      setAccountInfo(info);
    };

    checkAuth();
    
    // Check authentication status periodically
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    try {
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get authorization URL:', error);
    }
  };

  const handleLogout = async () => {
    await oauth2Manager.clearTokens();
    setIsAuthenticated(false);
    setAccountInfo(null);
    navigate('/jobs');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Startup Accelerator API Authentication</h1>
        <p className="text-muted-foreground">
          Connect to the Startup Accelerator Website API to access live job data and enable job applications
        </p>
      </div>

      {isAuthenticated && accountInfo ? (
        <div className="space-y-6">
          {/* Connected Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Connected to Startup Accelerator API
              </CardTitle>
              <CardDescription>
                Your Startup Accelerator Website API is connected and authenticated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Portal ID: {accountInfo.account || '4809'}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Job Board ID: 8734
                  </Badge>
                </div>
                
                <Alert>
                  <RefreshCw className="h-4 w-4" />
                  <AlertDescription>
                    Access tokens are automatically refreshed every 50 minutes to maintain continuous access.
                    Refresh tokens are kept active by refreshing every 10 days to prevent expiration.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button onClick={() => navigate('/jobs')}>
                    View Jobs
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    Disconnect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Authentication Required */}
          <Card>
            <CardHeader>
              <CardTitle>Connect to Startup Accelerator API</CardTitle>
              <CardDescription>
                Authenticate with the Startup Accelerator Website API to access live job data and enable job application submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This will redirect you to JobAdder's secure authentication page where you can grant access to the Startup Accelerator Website API.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleLogin} className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Connect to Startup Accelerator API
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* OAuth2 Information */}
          <Card>
            <CardHeader>
              <CardTitle>OAuth2 Authentication Details</CardTitle>
              <CardDescription>
                Information about the authentication process and token management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Access Token
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Valid for 60 minutes and automatically refreshed
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh Token
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Expires after 2 weeks of inactivity, kept alive automatically
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Automatic Token Management:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Access tokens are refreshed every 50 minutes (10 minutes before expiry)</li>
                      <li>Refresh tokens are used every 10 days to prevent expiration</li>
                      <li>Failed refresh attempts are automatically retried</li>
                      <li>Invalid tokens are detected and cleared automatically</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => navigate('/jobs')}>
                    Continue with Demo Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AuthLogin;