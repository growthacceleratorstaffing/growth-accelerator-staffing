import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SyncStatus {
  isLoading: boolean;
  lastSync: Date | null;
  error: string | null;
  jobsSynced: number;
  candidatesSynced: number;
}

export function useJobSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    lastSync: null,
    error: null,
    jobsSynced: 0,
    candidatesSynced: 0
  });
  
  const { toast } = useToast();

  const syncJobs = useCallback(async (direction: 'from-jobadder' | 'to-jobadder' | 'bidirectional' = 'bidirectional') => {
    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let jobsSynced = 0;
      let candidatesSynced = 0;

      if (direction === 'from-jobadder' || direction === 'bidirectional') {
        // Check if user is authenticated with JobAdder
        const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
        const isAuth = await oauth2Manager.isAuthenticated();
        
        if (!isAuth) {
          throw new Error('No JobAdder authentication. Please connect your JobAdder account first.');
        }

        // Get current user ID
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (!userId) {
          throw new Error('Please sign in to the app first.');
        }

        // Fetch latest jobs from JobAdder
        const { data: jobsData, error: jobsError } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'jobs', 
            limit: 100, 
            offset: 0,
            userId: userId
          },
          headers: {
            'x-user-id': userId
          }
        });

        if (jobsError) {
          throw new Error(`Failed to fetch jobs from JobAdder: ${jobsError.message}`);
        }

        if (!jobsData || !jobsData.success) {
          throw new Error(`Failed to fetch jobs from JobAdder: ${jobsData?.error || 'Unknown error'}`);
        }

        if (jobsData.data?.items) {
          jobsSynced = jobsData.data.items.length;
        }

        // Fetch latest candidates from JobAdder
        const { data: candidatesData, error: candidatesError } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'candidates', 
            limit: 100, 
            offset: 0,
            userId: userId
          },
          headers: {
            'x-user-id': userId
          }
        });

        if (candidatesError) {
          throw new Error(`Failed to fetch candidates from JobAdder: ${candidatesError.message}`);
        }

        if (!candidatesData || !candidatesData.success) {
          throw new Error(`Failed to fetch candidates from JobAdder: ${candidatesData?.error || 'Unknown error'}`);
        }

        if (candidatesData.data?.items) {
          candidatesSynced = candidatesData.data.items.length;
        }
      }

      // TODO: Implement sync TO JobAdder for application-created jobs
      // This would involve checking for jobs created in the application
      // that don't exist in JobAdder and pushing them

      setSyncStatus({
        isLoading: false,
        lastSync: new Date(),
        error: null,
        jobsSynced,
        candidatesSynced
      });

      toast({
        title: "Sync Completed",
        description: `Successfully synced ${jobsSynced} jobs and ${candidatesSynced} candidates from JobAdder.`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast]);

  const checkSyncStatus = useCallback(async () => {
    try {
      // Check if user is authenticated with JobAdder
      const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
      const isAuth = await oauth2Manager.isAuthenticated();
      
      if (!isAuth) {
        return {
          connected: false,
          error: 'No JobAdder authentication. Please connect your JobAdder account first.',
          apiHealth: 'unauthenticated'
        };
      }

      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        return {
          connected: false,
          error: 'Please sign in to the app first.',
          apiHealth: 'unauthenticated'
        };
      }

      // Check JobAdder API connectivity with user token
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'current-user',
          userId: userId
        },
        headers: {
          'x-user-id': userId
        }
        });

        if (error) {
          throw new Error(`JobAdder API connectivity check failed: ${error.message}`);
        }

        if (!data || !data.success) {
          throw new Error(`JobAdder API connectivity check failed: ${data?.error || 'Unknown error'}`);
        }

        return {
          connected: true,
          user: data.data,
          apiHealth: 'healthy'
        };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        apiHealth: 'unhealthy'
      };
    }
  }, []);

  return {
    syncStatus,
    syncJobs,
    checkSyncStatus
  };
}