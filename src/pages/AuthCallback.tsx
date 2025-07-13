import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const handleCallback = async () => {
      if (!mounted) return;
      
      try {
        // Get all URL parameters including hash fragments
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const hashParams = url.hash ? new URLSearchParams(url.hash.substring(1)) : new URLSearchParams();
        
        // Check both search params and hash params for OAuth data
        const code = params.get('code') || hashParams.get('code');
        const state = params.get('state') || hashParams.get('state');
        const errorParam = params.get('error') || hashParams.get('error');
        const errorDescription = params.get('error_description') || hashParams.get('error_description');

        // Handle authorization errors
        if (errorParam) {
          if (!mounted) return;
          setError(`JobAdder authorization failed: ${errorDescription || errorParam}`);
          setLoading(false);
          return;
        }

        // If no OAuth parameters at all, this is direct access - redirect immediately
        if (!code && !errorParam) {
          if (!mounted) return;
          navigate('/auth?tab=integrations', { replace: true });
          return;
        }

        // Validate the authorization code if present
        if (code && !oauth2Manager.validateCallback(code, state || undefined)) {
          setError('Invalid authorization callback - security validation failed');
          setLoading(false);
          return;
        }

        // Step 3: Exchange authorization code for tokens
        if (code) {
          console.log('Step 3: Exchanging OAuth code for tokens...');
          
          // Get current user session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) {
            throw new Error('User session not found - please sign in first');
          }
          
          const tokenResponse = await oauth2Manager.exchangeCodeForTokens(code);
          
          setSuccess(true);
          toast({
            title: "JobAdder Connected!",
            description: `Successfully connected to JobAdder API`,
          });

          // Check for stored redirect URL and use it
          const redirectUrl = sessionStorage.getItem('jobadder_redirect') || '/auth?tab=integrations';
          sessionStorage.removeItem('jobadder_redirect');
          
          setTimeout(() => {
            navigate(redirectUrl);
          }, 2000);
        }
        
      } catch (error) {
        console.error('OAuth callback processing failed:', error);
        
        let errorMessage = 'JobAdder authentication failed';
        if (error instanceof Error) {
          // Check if it's a specific error we can help with
          if (error.message.includes('redirect_uri')) {
            errorMessage = `Redirect URI mismatch: ${error.message}\n\nThe JobAdder application redirect URI must be set to: ${window.location.origin}/auth/callback`;
          } else if (error.message.includes('invalid_code') || error.message.includes('code')) {
            errorMessage = `Authorization code issue: ${error.message}\n\nThe authorization code may have expired or been used already.`;
          } else if (error.message.includes('User session not found')) {
            errorMessage = `${error.message}\n\nPlease sign in to your account first, then try connecting to JobAdder again.`;
          } else {
            errorMessage = error.message;
          }
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
    
    return () => {
      mounted = false;
    };
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Authenticating...</CardTitle>
            <CardDescription>Processing your Startup Accelerator API authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Authentication Failed
            </CardTitle>
            <CardDescription>There was an issue with your Startup Accelerator API authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="flex gap-4">
              <Button onClick={async () => {
                try {
                  // Check if user is signed in first
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session?.user?.id) {
                    toast({
                      title: "Sign In Required", 
                      description: "Please sign in to your account first",
                      variant: "destructive"
                    });
                    navigate('/auth');
                    return;
                  }
                  
                  const authUrl = await oauth2Manager.getAuthorizationUrl();
                  window.location.href = authUrl;
                } catch (error) {
                  console.error('Failed to get OAuth URL:', error);
                  toast({
                    title: "Setup Failed", 
                    description: "Failed to initiate JobAdder OAuth setup",
                    variant: "destructive"
                  });
                }
              }}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/job-board')}>
                Continue to Job Board
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Authentication Successful!
            </CardTitle>
            <CardDescription>You have successfully connected to the Startup Accelerator API</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your Startup Accelerator API connection is now active and tokens will be automatically refreshed.
                Redirecting to jobs page...
              </AlertDescription>
            </Alert>
            
            <Button onClick={() => navigate('/job-board')}>
              Go to Job Board
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default AuthCallback;