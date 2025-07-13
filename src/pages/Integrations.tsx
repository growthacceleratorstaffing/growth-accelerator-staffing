import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";

export default function Integrations() {
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
      console.log('Current URL:', window.location.href);
      console.log('Current hostname:', window.location.hostname);
      console.log('Current origin:', window.location.origin);
      
      console.log('Getting authorization URL...');
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      console.log('✅ Authorization URL received:', authUrl);
      
      // Store the current page to redirect back after OAuth
      sessionStorage.setItem('jobadder_redirect', '/integrations');
      console.log('Stored redirect path:', sessionStorage.getItem('jobadder_redirect'));
      
      console.log('🔄 Redirecting to JobAdder...');
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ JOBADDER CONNECTION FAILED:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast({
        title: "Connection Failed",
        description: "Failed to initiate JobAdder authentication",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    try {
      console.log('🧪 TESTING JOBADDER CONNECTION...');
      console.log('Testing client ID retrieval...');
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
        description: error.message,
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
              <h1 className="text-3xl font-bold">Integrations</h1>
              <p className="text-muted-foreground">
                Connect external services to enhance your workflow
              </p>
            </div>
          </div>

          {/* JobAdder Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                JobAdder Integration
              </CardTitle>
              <CardDescription>
                Connect your JobAdder account to access job boards and applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {jobAdderLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isJobAdderConnected ? (
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
              ) : (
                <div className="space-y-4">
                  <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      <strong>JobAdder Not Connected</strong>
                      <p className="text-sm mt-1">
                        Connect your JobAdder account to access job boards, listings, and submit applications.
                      </p>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={handleJobAdderConnect} 
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect JobAdder Account
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">What happens when you connect:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Access to your JobAdder job boards</li>
                        <li>• View and search job listings</li>
                        <li>• Submit job applications directly</li>
                        <li>• Import jobs to your local database</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
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
                    className="bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
                  >
                    Test Connection
                  </Button>
                )}
                
                {isJobAdderConnected && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/job-board')}
                  >
                    Go to Job Board
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}