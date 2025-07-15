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
      const { data, error } = await supabase.functions.invoke('jazzhr-api', {
        body: { 
          endpoint: 'import-candidate',
          candidate: candidate
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