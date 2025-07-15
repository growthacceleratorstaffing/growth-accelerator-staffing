import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface JobAdderCandidate {
  candidateId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  currentPosition?: string;
  company?: string;
  skills?: string[];
  rating?: number;
  status?: {
    name: string;
    statusId: number;
  };
  source?: string;
  createdAt?: string;
  linkedinUrl?: string;
  profilePictureUrl?: string;
}

export const useJobAdderCandidates = (search?: string) => {
  return useQuery({
    queryKey: ['jobadder-candidates', search],
    queryFn: async (): Promise<JobAdderCandidate[]> => {
      try {
        // Get user access token from OAuth2 manager
        const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
        const userAccessToken = await oauth2Manager.getValidAccessToken();
        
        if (!userAccessToken) {
          throw new Error('No JobAdder access token available. Please authenticate first.');
        }

        const { data, error } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'candidates',
            limit: 50,
            offset: 0,
            search: search,
            accessToken: userAccessToken
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        return data?.items || [];
      } catch (error) {
        console.error('Error fetching JobAdder candidates:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch candidates');
      }
    },
    enabled: true,
    refetchInterval: 20 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    retryDelay: 120000,
  });
};

export type { JobAdderCandidate };