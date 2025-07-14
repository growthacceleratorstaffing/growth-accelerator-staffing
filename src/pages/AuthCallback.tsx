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
    let processing = false; // Prevent double processing
    
    const handleCallback = async () => {
      if (!mounted || processing) return;
      processing = true;
      
      try {
        console.log('=== AuthCallback: Processing callback ===');
        console.log('Current URL:', window.location.href);
        console.log('Current origin:', window.location.origin);
        
        // Get all URL parameters including hash fragments
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const hashParams = url.hash ? new URLSearchParams(url.hash.substring(1)) : new URLSearchParams();
        
        // Check both search params and hash params for OAuth data
        const code = params.get('code') || hashParams.get('code');
        const state = params.get('state') || hashParams.get('state');
        const errorParam = params.get('error') || hashParams.get('error');
        const errorDescription = params.get('error_description') || hashParams.get('error_description');

        console.log('OAuth parameters:', { code: !!code, state, errorParam, errorDescription });

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
          console.log('No OAuth parameters found, redirecting to integrations...');
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
          // Check if this code has already been processed
          const processedCode = sessionStorage.getItem('processed_oauth_code');
          if (processedCode === code) {
            console.log('Authorization code already processed, skipping...');
            setError('Authorization code already used. Please start the connection process again.');
            setLoading(false);
            return;
          }
          
          console.log('Step 3: Exchanging OAuth code for tokens...');
          
          // Mark this code as being processed
          sessionStorage.setItem('processed_oauth_code', code);
          
          // Get current user session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) {
            throw new Error('User session not found - please sign in first');
          }
          
          const tokenResponse = await oauth2Manager.exchangeCodeForTokens(code);
          
          // Clear the processed code on success
          sessionStorage.removeItem('processed_oauth_code');
          
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
          if (error.message.includes('redirect_uri') || error.message.includes('invalid_grant')) {
            const hostname = window.location.hostname;
            const expectedUri = hostname === 'staffing.growthaccelerator.nl' 
              ? 'https://staffing.growthaccelerator.nl/auth/callback'
              : hostname === 'localhost' || hostname === '127.0.0.1'
              ? 'http://localhost:5173/auth/callback'
              : `${window.location.origin}/auth/callback`;
              
            errorMessage = `Redirect URI configuration issue.\n\nThe JobAdder application redirect URI must be set to: ${expectedUri}\n\nError details: ${error.message}`;
          } else if (error.message.includes('invalid_code') || error.message.includes('code')) {
            errorMessage = `Authorization code issue: ${error.message}\n\nThe authorization code may have expired or been used already. Please try connecting again.`;
          } else if (error.message.includes('User session not found')) {
            errorMessage = `${error.message}\n\nPlease sign in to your account first, then try connecting to JobAdder again.`;
          } else {
            errorMessage = error.message;
          }
        }
        
        setError(errorMessage);
        // Clear processed code on error so user can retry
        sessionStorage.removeItem('processed_oauth_code');
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