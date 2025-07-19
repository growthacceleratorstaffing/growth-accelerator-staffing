import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  User,
  LogIn,
  CheckCircle,
  Shield,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const { signIn, signUp, isAuthenticated, profile, jazzhrProfile, syncJazzHRUsers } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);


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

  const handleSyncJazzHRUsers = async () => {
    setIsLoading(true);
    try {
      await syncJazzHRUsers();
    } catch (error) {
      // Error handling is done in the useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const formatJazzHRRole = (role: string): string => {
    return role?.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') || 'User';
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
              Welcome to the JazzHR-powered Growth Accelerator Platform
            </p>
          </div>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            {/* Account Authentication Tab */}
            <TabsContent value="account" className="space-y-6">
              {isAuthenticated ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Welcome Back
                    </CardTitle>
                    <CardDescription>
                      You are signed in with JazzHR credentials
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                      <User className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {jazzhrProfile?.name || profile?.full_name || profile?.email || 'User'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {jazzhrProfile?.email || profile?.email}
                        </div>
                      </div>
                    </div>
                    
                    {jazzhrProfile && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
                        <Shield className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            JazzHR Role: {formatJazzHRRole(jazzhrProfile.jazzhr_role)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last synced: {new Date(jazzhrProfile.last_synced_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-4">
                      <Button onClick={() => navigate('/dashboard')} className="flex-1">
                        Go to Dashboard
                      </Button>
                      {jazzhrProfile?.jazzhr_role === 'super_admin' && (
                        <Button 
                          variant="outline" 
                          onClick={handleSyncJazzHRUsers}
                          disabled={isLoading}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                          Sync Users
                        </Button>
                      )}
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
                          Enter your credentials to access the platform
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
                          Join the platform
                        </CardTitle>
                        <CardDescription>
                          Create an account with your JazzHR email address
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm text-blue-700">
                            <Shield className="h-4 w-4 inline mr-1" />
                            Only JazzHR team members can register. Your email must be registered in the JazzHR system.
                          </p>
                        </div>
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

          </Tabs>
        </div>
      </div>
    </div>
  );
}