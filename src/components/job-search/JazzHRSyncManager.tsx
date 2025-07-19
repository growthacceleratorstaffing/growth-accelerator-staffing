import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Upload, Download, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SyncResult {
  success: boolean;
  message: string;
  local_to_jazzhr?: number;
  jazzhr_to_local?: number;
  total_jazzhr_jobs?: number;
  error?: string;
}

export const JazzHRSyncManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const performSync = async (action: 'syncToJazzHR' | 'syncFromJazzHR' | 'bidirectionalSync') => {
    setIsLoading(true);
    
    try {
      console.log(`Starting ${action}...`);
      
      const { data, error } = await supabase.functions.invoke('jazzhr-sync', {
        body: { action }
      });

      if (error) {
        throw error;
      }

      setLastSyncResult(data);

      if (data.success) {
        toast({
          title: "Sync Successful!",
          description: data.message,
          className: "bg-green-500 text-white border-green-600",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Error",
        description: "Failed to perform sync operation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          JazzHR Sync Manager
        </CardTitle>
        <CardDescription>
          Synchronize job postings between this application and JazzHR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => performSync('syncToJazzHR')}
            disabled={isLoading}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Upload className="h-4 w-4" />
            Sync TO JazzHR
          </Button>
          
          <Button
            onClick={() => performSync('syncFromJazzHR')}
            disabled={isLoading}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Sync FROM JazzHR
          </Button>
          
          <Button
            onClick={() => performSync('bidirectionalSync')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Full Bidirectional Sync
          </Button>
        </div>

        {lastSyncResult && (
          <Alert className={lastSyncResult.success ? "border-green-500" : "border-red-500"}>
            {lastSyncResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{lastSyncResult.message}</p>
                {lastSyncResult.success && (
                  <div className="flex gap-4 text-sm">
                    {lastSyncResult.local_to_jazzhr !== undefined && (
                      <Badge variant="outline">
                        Local → JazzHR: {lastSyncResult.local_to_jazzhr}
                      </Badge>
                    )}
                    {lastSyncResult.jazzhr_to_local !== undefined && (
                      <Badge variant="outline">
                        JazzHR → Local: {lastSyncResult.jazzhr_to_local}
                      </Badge>
                    )}
                    {lastSyncResult.total_jazzhr_jobs !== undefined && (
                      <Badge variant="outline">
                        Total JazzHR Jobs: {lastSyncResult.total_jazzhr_jobs}
                      </Badge>
                    )}
                  </div>
                )}
                {lastSyncResult.error && (
                  <p className="text-sm text-red-600">{lastSyncResult.error}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Sync TO JazzHR:</strong> Pushes locally created jobs to JazzHR</p>
          <p><strong>Sync FROM JazzHR:</strong> Pulls JazzHR jobs to local database</p>
          <p><strong>Bidirectional Sync:</strong> Performs both operations for complete synchronization</p>
        </div>
      </CardContent>
    </Card>
  );
};