import { useState, useEffect } from 'react';
import { JazzHRAPIClient, type JazzHRJob } from '@/lib/jazzhr-api';
import { supabase } from "@/integrations/supabase/client";

// Mock job detail data as fallback
const mockJobDetails: Record<string, JazzHRJob> = {
  "1": {
    id: "1",
    title: "Senior Frontend Developer",
    status: "Published",
    description: "We're looking for an experienced frontend developer to join our team and build cutting-edge web applications using React, TypeScript, and modern development practices.",
    department: "Engineering",
    hiring_lead: "John Smith"
  },
  "2": {
    id: "2",
    title: "Product Manager",
    status: "Published", 
    description: "Lead product strategy and development for our core platform, working closely with engineering and design teams to deliver exceptional user experiences.",
    department: "Product",
    hiring_lead: "Sarah Johnson"
  },
  "3": {
    id: "3",
    title: "UX Designer",
    status: "Published",
    description: "Create beautiful and intuitive user experiences for our digital products, conducting user research and creating wireframes, prototypes, and high-fidelity designs.",
    department: "Design",
    hiring_lead: "Mike Chen"
  }
};

export function useJobDetail(jobId: string | number) {
  const [jobDetail, setJobDetail] = useState<JazzHRJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!jobId) return;
      
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching job detail for ID:', jobId);
        
        // First try to fetch from local database (for jobs created locally)
        try {
          const { data: localJob, error: localError } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', String(jobId))
            .single();

          if (!localError && localJob) {
            console.log('Found local job:', localJob);
            // Convert local job to JazzHR format
            const convertedJob: JazzHRJob = {
              id: localJob.id,
              title: localJob.title,
              description: localJob.job_description || '',
              department: localJob.company_name || '',
              city: localJob.location_name?.split(',')[0] || '',
              state: localJob.location_name?.split(',')[1]?.trim() || '',
              employment_type: localJob.work_type_name || 'Full-time',
              created_at: localJob.created_at,
              status: 'Open',
              hiring_lead: 'Growth Accelerator Team'
            };
            setJobDetail(convertedJob);
            setUseMockData(false);
            return; // Found local job, no need to continue
          }
        } catch (localErr) {
          console.log('Local job not found, trying JazzHR:', localErr);
        }

        // If not found locally, try JazzHR API
        try {
          console.log('Trying JazzHR API for job:', jobId);
          const jazzHRClient = new JazzHRAPIClient();
          const detail = await jazzHRClient.getJob(String(jobId));
          setJobDetail(detail);
          setUseMockData(false);
          return; // Found JazzHR job, no need to continue
        } catch (jazzhrErr) {
          console.warn('JazzHR API unavailable:', jazzhrErr);
        }

        // Finally, fallback to mock data
        const mockDetail = mockJobDetails[String(jobId)];
        if (mockDetail) {
          setJobDetail(mockDetail);
          setUseMockData(true);
          setError('Using demo data - Job API unavailable');
        } else {
          setError('Job not found');
        }
      } catch (err) {
        console.error('Error fetching job detail:', err);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetail();
  }, [jobId]);

  return {
    jobDetail,
    loading,
    error,
    useMockData
  };
}