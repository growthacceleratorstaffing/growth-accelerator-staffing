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
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [isJazzHRConnected, setIsJazzHRConnected] = useState(false);
  const [jazzHRLoading, setJazzHRLoading] = useState(true);
  const { signIn, signUp, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Only redirect to dashboard if user is authenticated AND not trying to access integrations
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    
    if (isAuthenticated && tab !== 'integrations') {
      navigate("/dashboard");
    }
    checkJazzHRConnection();
  }, [isAuthenticated, navigate]);

  const checkJazzHRConnection = async () => {
    setJazzHRLoading(true);
    try {
      // Test JazzHR API connection
      const { data, error } = await supabase.functions.invoke('jazzhr-api', {
        body: { 
          endpoint: 'users'
        }
      });

      if (!error && data?.success) {
        setIsJazzHRConnected(true);
      } else {
        setIsJazzHRConnected(false);
      }
    } catch (error) {
      console.error('Failed to check JazzHR connection:', error);
      setIsJazzHRConnected(false);
    } finally {
      setJazzHRLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setJazzHRLoading(true);
      
      // Test the JazzHR API
      const { data, error } = await supabase.functions.invoke('jazzhr-api', {
        body: { 
          endpoint: 'users'
        }
      });
      
      if (data?.success) {
        toast({
          title: "Connection Test Successful", 
          description: "JazzHR API is accessible",
        });
        setIsJazzHRConnected(true);
      } else {
        throw new Error(data?.error || 'API test failed');
      }
    } catch (error) {
      console.error('Test connection failed:', error);
      setIsJazzHRConnected(false);
      toast({
        title: "Test Connection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setJazzHRLoading(false);
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
              Sign in to your account or check integrations
            </p>
          </div>

          <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') || 'account'} className="space-y-6">
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
                    JazzHR Integration
                  </CardTitle>
                  <CardDescription>
                    Check your JazzHR API connection status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {jazzHRLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : isJazzHRConnected ? (
                    <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <strong>JazzHR Connected</strong>
                            <p className="text-sm mt-1">
                              Your JazzHR API is successfully connected and ready to use.
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
                        <strong>JazzHR Not Connected</strong>
                        <p className="text-sm mt-1">
                          JazzHR API is not accessible. Please check your API key configuration.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={handleTestConnection} 
                      className="w-full"
                      disabled={jazzHRLoading}
                    >
                      {jazzHRLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                    
                    <Button 
                      onClick={checkJazzHRConnection} 
                      variant="outline" 
                      className="w-full"
                      disabled={jazzHRLoading}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}