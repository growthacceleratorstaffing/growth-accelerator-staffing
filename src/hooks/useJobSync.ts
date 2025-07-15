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

  const syncJobs = useCallback(async (direction: 'from-jazzhr' | 'to-jazzhr' | 'bidirectional' = 'bidirectional') => {
    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let jobsSynced = 0;
      let candidatesSynced = 0;

      if (direction === 'from-jazzhr' || direction === 'bidirectional') {
        // Get current user ID
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (!userId) {
          throw new Error('Please sign in to the app first.');
        }

        // Fetch latest jobs from JazzHR
        const { data: jobsData, error: jobsError } = await supabase.functions.invoke('jazzhr-api', {
          body: { 
            endpoint: 'jobs', 
            limit: 100, 
            offset: 0
          }
        });

        if (jobsError) {
          throw new Error(`Failed to fetch jobs from JazzHR: ${jobsError.message}`);
        }

        if (!jobsData || !jobsData.success) {
          throw new Error(`Failed to fetch jobs from JazzHR: ${jobsData?.error || 'Unknown error'}`);
        }

        if (jobsData.data?.length) {
          jobsSynced = jobsData.data.length;
        }

        // Fetch latest applicants from JazzHR
        const { data: candidatesData, error: candidatesError } = await supabase.functions.invoke('jazzhr-api', {
          body: { 
            endpoint: 'applicants', 
            limit: 100, 
            offset: 0
          }
        });

        if (candidatesError) {
          throw new Error(`Failed to fetch applicants from JazzHR: ${candidatesError.message}`);
        }

        if (!candidatesData || !candidatesData.success) {
          throw new Error(`Failed to fetch applicants from JazzHR: ${candidatesData?.error || 'Unknown error'}`);
        }

        if (candidatesData.data?.length) {
          candidatesSynced = candidatesData.data.length;
        }
      }

      // TODO: Implement sync TO JazzHR for application-created jobs
      // This would involve checking for jobs created in the application
      // that don't exist in JazzHR and pushing them

      setSyncStatus({
        isLoading: false,
        lastSync: new Date(),
        error: null,
        jobsSynced,
        candidatesSynced
      });

      toast({
        title: "Sync Completed",
        description: `Successfully synced ${jobsSynced} jobs and ${candidatesSynced} candidates from JazzHR.`,
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

      // Check JazzHR API connectivity
      const { data, error } = await supabase.functions.invoke('jazzhr-api', {
        body: { 
          endpoint: 'users'
        }
      });

      if (error) {
        throw new Error(`JazzHR API connectivity check failed: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(`JazzHR API connectivity check failed: ${data?.error || 'Unknown error'}`);
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