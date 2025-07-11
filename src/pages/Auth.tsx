import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw,
  Settings,
  User,
  LogIn
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [isJobAdderConnected, setIsJobAdderConnected] = useState(false);
  const [jobAdderLoading, setJobAdderLoading] = useState(true);
  const { signIn, signUp, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
    checkJobAdderConnection();
  }, [isAuthenticated, navigate]);

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
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      // Store the current page to redirect back after OAuth
      sessionStorage.setItem('jobadder_redirect', '/auth');
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate JobAdder authentication",
        variant: "destructive"
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(signInEmail, signInPassword);
    } catch (error) {
      // Error handling is done in the useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(signUpEmail, signUpPassword, signUpName);
    } catch (error) {
      // Error handling is done in the useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <User className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Growth Accelerator</h1>
            </div>
            <p className="text-muted-foreground">
              Sign in to your account or set up integrations
            </p>
          </div>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            {/* Account Authentication Tab */}
            <TabsContent value="account" className="space-y-6">
              {isAuthenticated ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Signed In
                    </CardTitle>
                    <CardDescription>
                      You are currently signed in to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                      <User className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {profile?.full_name || profile?.email || 'User'}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {profile?.role || 'viewer'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={() => navigate('/dashboard')} className="flex-1">
                        Go to Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="signin" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Signing in..." : "Sign In"}
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
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating account..." : "Create Account"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
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
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={checkJobAdderConnection}
                      disabled={jobAdderLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${jobAdderLoading ? 'animate-spin' : ''}`} />
                      Refresh Status
                    </Button>
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
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}