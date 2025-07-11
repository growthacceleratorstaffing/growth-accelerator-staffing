import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LogIn, User, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";
import { useLocation } from "react-router-dom";

const Auth = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // JobAdder auth states
  const [jobAdderAuthStatus, setJobAdderAuthStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [jobAdderAuthMessage, setJobAdderAuthMessage] = useState<string>('');
  const [isJobAdderConnected, setIsJobAdderConnected] = useState(false);
  
  const { signIn, signUp, isAuthenticated } = useAuth();

  // Check if this is a JobAdder OAuth callback or direct visit
  const isJobAdderRoute = location.pathname === '/jobadder-auth';

  useEffect(() => {
    checkJobAdderAuth();
    
    // Handle JobAdder OAuth callback
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      setJobAdderAuthStatus('error');
      setJobAdderAuthMessage(`JobAdder authentication failed: ${error}`);
      return;
    }
    
    if (code) {
      handleJobAdderCallback(code);
    }
  }, [searchParams]);

  const checkJobAdderAuth = async () => {
    const isAuth = await oauth2Manager.isAuthenticated();
    setIsJobAdderConnected(isAuth);
    
    if (isAuth) {
      const accountInfo = oauth2Manager.getAccountInfo();
      setJobAdderAuthMessage(`Connected to ${accountInfo?.instance || 'JobAdder'}`);
    }
  };

  const handleJobAdderCallback = async (code: string) => {
    setJobAdderAuthStatus('processing');
    setJobAdderAuthMessage('Processing JobAdder authorization...');
    
    try {
      const tokenResponse = await oauth2Manager.exchangeCodeForTokens(code);
      setJobAdderAuthStatus('success');
      setJobAdderAuthMessage('Successfully connected to JobAdder!');
      setIsJobAdderConnected(true);
      
      toast({
        title: "JobAdder Connected",
        description: "Your JobAdder account has been connected successfully.",
      });
      
    } catch (error) {
      setJobAdderAuthStatus('error');
      setJobAdderAuthMessage(error instanceof Error ? error.message : 'JobAdder authentication failed');
      
      toast({
        title: "JobAdder Connection Failed",
        description: "Failed to connect to JobAdder. Please try again.",
        variant: "destructive"
      });
    }
  };

  const initiateJobAdderAuth = async () => {
    try {
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get JobAdder authorization URL:', error);
      toast({
        title: "Error",
        description: "Failed to initiate JobAdder authentication",
        variant: "destructive"
      });
    }
  };

  const disconnectJobAdder = async () => {
    await oauth2Manager.clearTokens();
    setIsJobAdderConnected(false);
    setJobAdderAuthStatus('idle');
    setJobAdderAuthMessage('');
    
    toast({
      title: "Disconnected",
      description: "JobAdder account has been disconnected.",
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(signInEmail, signInPassword);
    } catch (error) {
      // Error handling is done in the useAuth hook
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(signUpEmail, signUpPassword, signUpName);
    } catch (error) {
      // Error handling is done in the useAuth hook
    } finally {
      setLoading(false);
    }
  };

  // Redirect authenticated users if they're not on JobAdder OAuth flow
  useEffect(() => {
    if (isAuthenticated && !isJobAdderRoute && !searchParams.get('code')) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isJobAdderRoute, searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <User className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Growth Accelerator</h1>
            </div>
            <p className="text-muted-foreground">
              Sign in to access your staffing platform
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="jobadder">JobAdder</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Sign In
                  </CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Create Account
                  </CardTitle>
                  <CardDescription>
                    Create a new account to get started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="jobadder">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    JobAdder Integration
                  </CardTitle>
                  <CardDescription>
                    Connect your JobAdder account to access job postings and applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium">JobAdder Status</span>
                    <Badge variant={isJobAdderConnected ? "default" : "secondary"} className="flex items-center gap-1">
                      {isJobAdderConnected ? (
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
                  {jobAdderAuthMessage && (
                    <Alert variant={jobAdderAuthStatus === 'error' ? 'destructive' : 'default'}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{jobAdderAuthMessage}</AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {!isJobAdderConnected ? (
                      <Button 
                        onClick={initiateJobAdderAuth} 
                        className="w-full"
                        disabled={jobAdderAuthStatus === 'processing'}
                      >
                        {jobAdderAuthStatus === 'processing' ? (
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
                          onClick={() => navigate('/job-board')} 
                          className="w-full"
                        >
                          Go to Job Board
                        </Button>
                        
                        <Button 
                          onClick={disconnectJobAdder} 
                          variant="destructive" 
                          size="sm" 
                          className="w-full"
                        >
                          Disconnect JobAdder
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
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
};

export default Auth;