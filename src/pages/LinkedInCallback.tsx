import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      if (!user) {
        setStatus('error');
        setMessage('User not authenticated');
        return;
      }

      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(errorDescription || error);
        toast({
          title: "LinkedIn Authorization Failed",
          description: errorDescription || error,
          variant: "destructive"
        });
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        return;
      }

      try {
        // Exchange the authorization code for an access token
        const { data, error: exchangeError } = await supabase.functions.invoke('linkedin-oauth', {
          body: { 
            action: 'exchangeToken',
            code,
            redirectUri: `${window.location.origin}/linkedin-callback`
          }
        });

        if (exchangeError) throw exchangeError;

        if (data?.success) {
          setStatus('success');
          setMessage('LinkedIn account connected successfully!');
          
          toast({
            title: "Success",
            description: "LinkedIn account connected successfully!",
          });

          // Redirect to advertising page after 2 seconds
          setTimeout(() => {
            navigate('/advertising');
          }, 2000);
        } else {
          throw new Error(data?.error || 'Failed to exchange token');
        }
      } catch (error) {
        console.error('Error in LinkedIn callback:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect LinkedIn account');
        
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect LinkedIn account",
          variant: "destructive"
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast, user]);

  const handleReturnToAdvertising = () => {
    navigate('/advertising');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {status === 'error' && <X className="h-5 w-5 text-red-500" />}
              LinkedIn Integration
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Processing LinkedIn authorization...'}
              {status === 'success' && 'Connection successful'}
              {status === 'error' && 'Connection failed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
            
            {status === 'loading' && (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            {status === 'success' && (
              <div className="space-y-2">
                <p className="text-sm text-green-600">
                  You will be redirected to the advertising page shortly...
                </p>
              </div>
            )}
            
            {status === 'error' && (
              <Button onClick={handleReturnToAdvertising} className="w-full">
                Return to Advertising
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}