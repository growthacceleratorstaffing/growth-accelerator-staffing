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
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setError(`Authentication failed: ${errorDescription || errorParam}`);
        setLoading(false);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setLoading(false);
        return;
      }

      try {
        const tokenResponse = await oauth2Manager.exchangeCodeForTokens(code);
        
        setSuccess(true);
        toast({
          title: "Authentication Successful!",
          description: `Connected to Startup Accelerator API (Portal: ${tokenResponse.account})`,
        });

        // Redirect to dashboard after successful authentication
        setTimeout(() => {
          navigate('/job-board');
        }, 2000);
        
      } catch (error) {
        console.error('Token exchange failed:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
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
              <Button onClick={() => navigate('/jobadder-auth')}>
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