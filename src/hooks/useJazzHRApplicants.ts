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
    queryFn: async () => {
      const applicants = await jazzhrAPI.getApplicants(filters);
      
      // Remove duplicates based on email and name
      const uniqueApplicants = applicants.filter((applicant, index, self) => {
        return index === self.findIndex(a => 
          (a.email && applicant.email && a.email.toLowerCase() === applicant.email.toLowerCase()) ||
          (a.first_name === applicant.first_name && a.last_name === applicant.last_name && a.job_id === applicant.job_id)
        );
      });
      
      return uniqueApplicants;
    },
    refetchInterval: 20 * 60 * 1000, // 20 minutes
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
    retryDelay: 120000, // 2 minutes
  });
};