import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useCandidateImport = () => {
  const [importingCandidates, setImportingCandidates] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const importCandidate = async (candidate: any) => {
    const candidateId = candidate.candidateId?.toString() || '';
    setImportingCandidates(prev => new Set([...prev, candidateId]));
    
    try {
      // Get user access token from OAuth2 manager
      const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
      const userAccessToken = await oauth2Manager.getValidAccessToken();
      
      if (!userAccessToken) {
        throw new Error('No JobAdder access token available. Please authenticate first.');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'import-candidate',
          candidate: candidate,
          accessToken: userAccessToken
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Candidate Imported Successfully",
        description: `${candidate.firstName} ${candidate.lastName} has been imported to your candidate database.`,
      });

      console.log('Candidate imported:', data);
      return data;
    } catch (error) {
      console.error('Error importing candidate:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Failed to import candidate',
        variant: "destructive"
      });
      throw error;
    } finally {
      setImportingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  return {
    importCandidate,
    importingCandidates,
  };
};