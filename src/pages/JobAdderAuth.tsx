import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  ArrowLeft,
  Settings,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";

export default function JobAdderAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const authenticated = await oauth2Manager.isAuthenticated();
      setIsConnected(authenticated);
    } catch (error) {
      console.error('Failed to check JobAdder connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      // Store the current page to redirect back after OAuth
      sessionStorage.setItem('jobadder_redirect', '/job-board');
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate JobAdder authentication",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear any stored tokens (this would need to be implemented in oauth2Manager)
      // For now, we'll just refresh the connection status
      await checkConnection();
      toast({
        title: "Disconnected",
        description: "JobAdder account disconnected",
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from JobAdder",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold">JobAdder Integration</h1>
              <p className="text-muted-foreground">
                Connect your JobAdder account to access job boards and applications
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>Connected to JobAdder</strong>
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
              ) : (
                <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    <div>
                      <strong>Not Connected</strong>
                      <p className="text-sm mt-1">
                        Connect your JobAdder account to access job boards, listings, and submit applications.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your JobAdder integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Connect to JobAdder</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You'll be redirected to JobAdder to sign in and authorize this application. 
                      This is a one-time setup that will allow you to access your job boards and submit applications.
                    </p>
                    <Button 
                      onClick={handleConnect} 
                      disabled={connecting}
                      className="w-full sm:w-auto"
                    >
                      {connecting ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      {connecting ? 'Connecting...' : 'Connect JobAdder Account'}
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-2">What happens when you connect:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Access to your JobAdder job boards</li>
                      <li>• View and search job listings</li>
                      <li>• Submit job applications directly</li>
                      <li>• Import jobs to your local database</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Connected Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Your JobAdder integration is active and working.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={checkConnection}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh Status
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/job-board')}
                      className="w-full sm:w-auto"
                    >
                      Go to Job Board
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help & Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Having trouble connecting?</strong> Make sure you have a valid JobAdder account 
                  and the necessary permissions to access job boards.
                </p>
                <p>
                  <strong>Lost connection?</strong> You can refresh your connection status or reconnect 
                  your account at any time.
                </p>
                <p>
                  <strong>Security:</strong> Your JobAdder credentials are never stored on our servers. 
                  We only store secure access tokens that can be revoked at any time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}