import { useQuery } from '@tanstack/react-query';
import { jazzhrAPI, JazzHRJob } from '@/lib/jazzhr-api';

export const useJazzHRJobs = (filters?: {
  title?: string;
  department?: string;
  status?: string;
  city?: string;
  state?: string;
}) => {
  return useQuery({
    queryKey: ['jazzhr-jobs', filters],
    queryFn: () => jazzhrAPI.getJobs(filters),
    refetchInterval: 60 * 60 * 1000, // 1 hour
    staleTime: 45 * 60 * 1000, // 45 minutes
    gcTime: 4 * 60 * 60 * 1000, // 4 hours
    retry: 1,
    retryDelay: 120000, // 2 minutes
  });
};