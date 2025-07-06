import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react";
import { useJobSync } from "@/hooks/useJobSync";
import { useAuth } from "@/hooks/useAuth";

export const JobSyncStatus = () => {
  const { syncStatus, syncJobs, checkSyncStatus } = useJobSync();
  const { isAuthenticated } = useAuth();
  const [apiHealth, setApiHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');

  useEffect(() => {
    if (isAuthenticated) {
      checkApiHealth();
    }
  }, [isAuthenticated]);

  const checkApiHealth = async () => {
    setApiHealth('checking');
    const status = await checkSyncStatus();
    setApiHealth(status.connected ? 'healthy' : 'unhealthy');
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              JobAdder Sync Status
            </CardTitle>
            <CardDescription>
              Bi-directional synchronization with JobAdder platform
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {apiHealth === 'checking' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Checking
              </Badge>
            )}
            {apiHealth === 'healthy' && (
              <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            )}
            {apiHealth === 'unhealthy' && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Last Sync</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatLastSync(syncStatus.lastSync)}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Jobs Synced</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {syncStatus.jobsSynced}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Candidates Synced</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {syncStatus.candidatesSynced}
            </p>
          </div>
        </div>

        {syncStatus.error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Sync Error</span>
            </div>
            <p className="text-sm text-destructive mt-1">{syncStatus.error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => syncJobs('bidirectional')}
            disabled={syncStatus.isLoading}
            className="flex-1"
          >
            {syncStatus.isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={checkApiHealth}
            disabled={apiHealth === 'checking'}
          >
            Check Status
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => window.open('/jobadder-auth', '_blank')}
            size="sm"
          >
            Setup OAuth
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Bi-directional Sync:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Jobs created in this app are automatically posted to JobAdder</li>
            <li>• Jobs from JobAdder are displayed in the Jobs section</li>
            <li>• Candidates from JobAdder are shown in the Candidates section</li>
            <li>• Job applications are synchronized both ways</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};