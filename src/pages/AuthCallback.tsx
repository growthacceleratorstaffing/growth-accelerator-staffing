import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('AuthCallback component mounted, current URL:', window.location.href);
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('AuthCallback - Processing OAuth callback:', {
        hostname: window.location.hostname,
        fullUrl: window.location.href,
        hasCode: !!code,
        hasState: !!state,
        hasError: !!errorParam,
        searchParams: Array.from(searchParams.entries())
      });

      // Step 2: Handle authorization errors
      if (errorParam) {
        console.error('OAuth authorization error:', errorParam, errorDescription);
        setError(`JobAdder authorization failed: ${errorDescription || errorParam}`);
        setLoading(false);
        return;
      }

      // If no OAuth parameters, redirect to auth page instead of initiating OAuth
      if (!code && !errorParam) {
        console.log('No OAuth parameters found, redirecting to auth page...');
        navigate('/auth?tab=integrations');
        return;
      }

      // Handle production callback - forward to preview environment with OAuth parameters
      if (window.location.hostname === 'staffing.growthaccelerator.nl') {
        if (code) {
          const redirectParams = new URLSearchParams();
          redirectParams.set('code', code);
          if (state) redirectParams.set('state', state);
          
          const previewUrl = `https://4f7c8635-0e94-4f6c-aa92-8aa19bb9021a.lovableproject.com/auth/callback?${redirectParams}`;
          console.log('Production callback - redirecting to preview:', previewUrl);
          window.location.href = previewUrl;
          return;
        } else if (errorParam) {
          const redirectParams = new URLSearchParams();
          redirectParams.set('error', errorParam);
          if (errorDescription) redirectParams.set('error_description', errorDescription);
          
          const previewUrl = `https://4f7c8635-0e94-4f6c-aa92-8aa19bb9021a.lovableproject.com/auth/callback?${redirectParams}`;
          console.log('Production callback error - redirecting to preview:', previewUrl);
          window.location.href = previewUrl;
          return;
        }
      }

      // Step 2: Validate the authorization code and state
      if (!oauth2Manager.validateCallback(code!, state || undefined)) {
        setError('Invalid authorization callback - security validation failed');
        setLoading(false);
        return;
      }

      // Step 3: Exchange authorization code for tokens
      try {
        console.log('Step 3: Exchanging OAuth code for tokens...');
        const tokenResponse = await oauth2Manager.exchangeCodeForTokens(code!);
        
        setSuccess(true);
        toast({
          title: "JobAdder Connected!",
          description: `Successfully connected to JobAdder API`,
        });

        // Check for stored redirect URL and use it
        const redirectUrl = sessionStorage.getItem('jobadder_redirect') || '/job-board';
        sessionStorage.removeItem('jobadder_redirect');
        
        setTimeout(() => {
          navigate(redirectUrl);
        }, 2000);
        
      } catch (error) {
        console.error('Token exchange failed:', error);
        setError(error instanceof Error ? error.message : 'JobAdder authentication failed');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

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