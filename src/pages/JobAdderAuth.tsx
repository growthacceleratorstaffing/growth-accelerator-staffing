import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw,
  Settings,
  ArrowLeft,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";

export default function JobAdderAuth() {
  const [isJobAdderConnected, setIsJobAdderConnected] = useState(false);
  const [jobAdderLoading, setJobAdderLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkJobAdderConnection();
  }, []);

  const checkJobAdderConnection = async () => {
    setJobAdderLoading(true);
    try {
      const authenticated = await oauth2Manager.isAuthenticated();
      setIsJobAdderConnected(authenticated);
    } catch (error) {
      console.error('Failed to check JobAdder connection:', error);
      setIsJobAdderConnected(false);
    } finally {
      setJobAdderLoading(false);
    }
  };

  const handleJobAdderConnect = async () => {
    try {
      console.log('🚀 STARTING JOBADDER CONNECTION PROCESS');
      
      // Clear any existing tokens first to prevent conflicts
      console.log('🧹 Clearing existing tokens to prevent conflicts...');
      await oauth2Manager.clearTokensBeforeAuth();
      
      console.log('Getting authorization URL...');
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      console.log('✅ Authorization URL received:', authUrl);
      
      // Store the current page to redirect back after OAuth
      sessionStorage.setItem('jobadder_redirect', '/jobadder-auth');
      
      console.log('🔄 Redirecting to JobAdder...');
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ JOBADDER CONNECTION FAILED:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to initiate JobAdder authentication",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    try {
      console.log('🧪 TESTING JOBADDER CONNECTION...');
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      console.log('✅ Test successful! Auth URL would be:', authUrl);
      toast({
        title: "Test Successful",
        description: "JobAdder connection test passed",
        variant: "default"
      });
    } catch (error) {
      console.error('❌ CONNECTION TEST FAILED:', error);
      toast({
        title: "Test Failed", 
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await oauth2Manager.clearTokens();
      setIsJobAdderConnected(false);
      toast({
        title: "Disconnected",
        description: "JobAdder account has been disconnected",
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect JobAdder account",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">JobAdder Authentication</h1>
              <p className="text-muted-foreground">
                Secure OAuth2 connection to your JobAdder account
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Secure Authentication</strong>
              <p className="text-sm mt-1">
                This uses OAuth2 to securely connect to JobAdder without storing your password. 
                You can revoke access at any time from your JobAdder settings.
              </p>
            </AlertDescription>
          </Alert>

          {/* JobAdder Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                JobAdder Connection Status
              </CardTitle>
              <CardDescription>
                Connect your JobAdder account to access job boards, applications, and candidate data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {jobAdderLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isJobAdderConnected ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>JobAdder Connected</strong>
                          <p className="text-sm mt-1">
                            Your JobAdder account is successfully connected and ready to use.
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/job-board')}
                    >
                      Go to Job Board
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/integrations')}
                    >
                      Integration Settings
                    </Button>
                    
                    <Button 
                      variant="destructive"
                      onClick={handleDisconnect}
                      size="sm"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      <strong>JobAdder Not Connected</strong>
                      <p className="text-sm mt-1">
                        Connect your JobAdder account to access job boards, listings, and candidate management.
                      </p>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={handleJobAdderConnect} 
                      className="w-full"
                      size="lg"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect JobAdder Account
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">What happens when you connect:</p>
                      <ul className="space-y-1 text-xs pl-4">
                        <li>• Secure OAuth2 authentication (no password storage)</li>
                        <li>• Access to your JobAdder job boards</li>
                        <li>• View and search job listings</li>
                        <li>• Submit job applications directly</li>
                        <li>• Import jobs and candidates to local database</li>
                        <li>• Automatic token refresh for seamless access</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 flex-wrap pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={checkJobAdderConnection}
                  disabled={jobAdderLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${jobAdderLoading ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
                
                {!isJobAdderConnected && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                  >
                    Test Connection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* OAuth Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">OAuth2 Security Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Authentication Method:</strong> OAuth2 Authorization Code Flow</p>
                <p><strong>Permissions Requested:</strong> Read, Write, Offline Access</p>
                <p><strong>Token Expiry:</strong> 60 minutes (automatically refreshed)</p>
                <p><strong>Data Storage:</strong> Only access tokens (encrypted in database)</p>
                <p><strong>Revocation:</strong> You can disconnect at any time</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}