import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Linkedin, CheckCircle, XCircle, Copy } from 'lucide-react';

const LinkedInCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [accessToken, setAccessToken] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setError(`LinkedIn OAuth error: ${error} - ${errorDescription}`);
        setProcessing(false);
        return;
      }

      if (!code) {
        setError('No authorization code received from LinkedIn');
        setProcessing(false);
        return;
      }

      try {
        // Exchange authorization code for access token
        const { data, error: exchangeError } = await supabase.functions.invoke('linkedin-api', {
          body: { 
            action: 'exchangeCodeForToken', 
            code: code, 
            state: state 
          }
        });

        if (exchangeError) {
          throw new Error(exchangeError.message);
        }

        if (data?.success && data.data?.access_token) {
          setAccessToken(data.data.access_token);
          toast({
            title: "Success!",
            description: `Access token generated successfully. Expires in ${Math.round(data.data.expires_in / 3600)} hours.`
          });
        } else {
          throw new Error('Failed to exchange code for access token');
        }

      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, toast]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(accessToken);
      toast({
        title: "Copied!",
        description: "Access token copied to clipboard"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const goToIntegration = () => {
    navigate('/linkedin-integration');
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Linkedin className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">LinkedIn OAuth Callback</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {processing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>}
            {!processing && !error && <CheckCircle className="h-5 w-5 text-green-600" />}
            {!processing && error && <XCircle className="h-5 w-5 text-red-600" />}
            
            {processing ? 'Processing Authorization...' : 
             error ? 'Authorization Failed' : 
             'Authorization Successful'}
          </CardTitle>
          <CardDescription>
            {processing ? 'Exchanging authorization code for access token...' :
             error ? 'There was an error processing your LinkedIn authorization.' :
             'Your LinkedIn access token has been generated successfully.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error Details:</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {accessToken && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium mb-2">Access Token Generated:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white border rounded text-sm font-mono break-all">
                    {accessToken}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyToClipboard}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium mb-2">Next Steps:</p>
                <ol className="text-blue-700 text-sm space-y-1">
                  <li>1. Copy the access token above</li>
                  <li>2. Go to your Supabase dashboard</li>
                  <li>3. Update the LINKEDIN_ACCESS_TOKEN secret</li>
                  <li>4. Return to the LinkedIn integration page</li>
                  <li>5. Test the connection</li>
                </ol>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={goToIntegration} variant="outline">
              Back to LinkedIn Integration
            </Button>
            
            {accessToken && (
              <Button asChild>
                <a 
                  href="https://supabase.com/dashboard/project/doulsumepjfihqowzheq/settings/functions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Update Supabase Secret
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInCallback;