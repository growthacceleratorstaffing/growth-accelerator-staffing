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
    refetchInterval: 20 * 60 * 1000, // 20 minutes
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
    retryDelay: 120000, // 2 minutes
  });
};