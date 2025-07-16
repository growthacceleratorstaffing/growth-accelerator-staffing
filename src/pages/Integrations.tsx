import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Integrations() {
  const [isJazzHRConnected, setIsJazzHRConnected] = useState(false);
  const [jazzHRLoading, setJazzHRLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkJazzHRConnection();
  }, []);

  const checkJazzHRConnection = async () => {
    setJazzHRLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('jazzhr-api', {
        body: { action: 'getUsers', params: {} }
      });
      console.log('JazzHR API response:', { data, error });
      setIsJazzHRConnected(!error && data);
    } catch (error) {
      console.error('Test connection failed:', error);
      setIsJazzHRConnected(false);
    } finally {
      setJazzHRLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Manage your external service connections</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            JazzHR Integration
          </CardTitle>
          <CardDescription>Connect to JazzHR to sync jobs and candidates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jazzHRLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isJazzHRConnected ? (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>JazzHR Connected</strong>
                    <p className="text-sm mt-1">Your JazzHR API is ready to use.</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>JazzHR API is not accessible. Please check your API key configuration.</AlertDescription>
            </Alert>
          )}
          
          <Button onClick={checkJazzHRConnection} className="w-full" disabled={jazzHRLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}