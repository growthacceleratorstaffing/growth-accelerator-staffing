import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import oauth2Manager from "@/lib/oauth2-manager";
import { useToast } from "@/hooks/use-toast";

const JobAdderAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [authMessage, setAuthMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkExistingAuth();
    
    // Handle OAuth callback
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      setAuthStatus('error');
      setAuthMessage(`Authentication failed: ${error}`);
      return;
    }
    
    if (code) {
      handleAuthCallback(code);
    }
  }, [searchParams]);

  const checkExistingAuth = () => {
    const isAuth = oauth2Manager.isAuthenticated();
    setIsConnected(isAuth);
    
    if (isAuth) {
      const accountInfo = oauth2Manager.getAccountInfo();
      setAuthMessage(`Connected to ${accountInfo?.instance || 'JobAdder'}`);
    }
  };

  const handleAuthCallback = async (code: string) => {
    setAuthStatus('processing');
    setAuthMessage('Processing authorization...');
    
    try {
      const tokenResponse = await oauth2Manager.exchangeCodeForTokens(code);
      setAuthStatus('success');
      setAuthMessage('Successfully connected to JobAdder!');
      setIsConnected(true);
      
      toast({
        title: "Authentication Successful",
        description: "Your JobAdder account has been connected successfully.",
      });
      
      // Redirect to job board after short delay
      setTimeout(() => {
        navigate('/job-board');
      }, 2000);
      
    } catch (error) {
      setAuthStatus('error');
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed');
      
      toast({
        title: "Authentication Failed",
        description: "Failed to connect to JobAdder. Please try again.",
        variant: "destructive"
      });
    }
  };

  const initiateAuth = () => {
    const authUrl = oauth2Manager.getAuthorizationUrl();
    window.location.href = authUrl;
  };

  const disconnectAuth = () => {
    oauth2Manager.clearTokens();
    setIsConnected(false);
    setAuthStatus('idle');
    setAuthMessage('');
    
    toast({
      title: "Disconnected",
      description: "JobAdder account has been disconnected.",
    });
  };

  const testConnection = async () => {
    try {
      setAuthStatus('processing');
      setAuthMessage('Testing connection...');
      
      const token = await oauth2Manager.getValidAccessToken();
      if (token) {
        setAuthStatus('success');
        setAuthMessage('Connection test successful!');
        
        toast({
          title: "Connection Test Passed",
          description: "JobAdder API connection is working properly.",
        });
      } else {
        throw new Error('No valid access token available');
      }
    } catch (error) {
      setAuthStatus('error');
      setAuthMessage(error instanceof Error ? error.message : 'Connection test failed');
      
      toast({
        title: "Connection Test Failed",
        description: "Please re-authenticate with JobAdder.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <ExternalLink className="h-6 w-6 text-primary" />
            JobAdder Integration
          </CardTitle>
          <CardDescription>
            Connect your JobAdder account to access job postings and applications
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <span className="font-medium">Connection Status</span>
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>

          {/* Status Message */}
          {authMessage && (
            <Alert variant={authStatus === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isConnected ? (
              <Button 
                onClick={initiateAuth} 
                className="w-full"
                disabled={authStatus === 'processing'}
              >
                {authStatus === 'processing' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect to JobAdder
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={testConnection} 
                  variant="outline" 
                  className="w-full"
                  disabled={authStatus === 'processing'}
                >
                  {authStatus === 'processing' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => navigate('/job-board')} 
                  className="w-full"
                >
                  Go to Job Board
                </Button>
                
                <Button 
                  onClick={disconnectAuth} 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {/* OAuth Info */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
            <p><strong>Scopes:</strong> read, write, offline_access</p>
            <p><strong>Permissions:</strong> Access to jobs, candidates, and job boards</p>
            <p><strong>Security:</strong> OAuth2 with refresh tokens</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobAdderAuth;