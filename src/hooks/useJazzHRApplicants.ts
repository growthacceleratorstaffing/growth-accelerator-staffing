import { useQuery } from '@tanstack/react-query';
import { jazzhrAPI, JazzHRApplicant } from '@/lib/jazzhr-api';

export const useJazzHRApplicants = (filters?: {
  name?: string;
  job_id?: string;
  city?: string;
  status?: string;
  rating?: string;
  from_apply_date?: string;
  to_apply_date?: string;
}) => {
  return useQuery({
    queryKey: ['jazzhr-applicants', filters],
    queryFn: () => jazzhrAPI.getApplicants(filters),
    refetchInterval: 20 * 60 * 1000, // 20 minutes
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
    retryDelay: 120000, // 2 minutes
  });
};