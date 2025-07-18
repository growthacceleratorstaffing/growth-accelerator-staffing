import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { JazzHRJob, JazzHRApplicant } from '@/lib/jazzhr-api';

export interface JazzHRJobWithApplicants extends JazzHRJob {
  applicants?: JazzHRApplicant[];
  company_name?: string;
  location_name?: string;
}

// Mock data as fallback - JazzHR structure
const mockJobs: JazzHRJobWithApplicants[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    description: "Join our innovative team building cutting-edge web applications",
    department: "Engineering",
    city: "San Francisco",
    state: "CA",
    employment_type: "Full-time",
    created_at: "2024-01-22T10:30:00Z",
    hiring_lead: "John Smith",
    status: "open"
  },
  {
    id: "2", 
    title: "Product Manager",
    description: "Lead product strategy for our core platform",
    department: "Product",
    city: "New York",
    state: "NY",
    employment_type: "Full-time",
    created_at: "2024-01-15T14:20:00Z",
    hiring_lead: "Sarah Johnson",
    status: "open"
  },
  {
    id: "3",
    title: "UX Designer", 
    description: "Create beautiful and intuitive user experiences",
    department: "Design",
    city: "Remote",
    state: "",
    employment_type: "Contract",
    created_at: "2024-01-19T09:15:00Z",
    hiring_lead: "Mike Chen",
    status: "open"
  }
];

export function useJobs() {
  const [jobs, setJobs] = useState<JazzHRJobWithApplicants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchJobs = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching jobs from JazzHR...');
      
      // Fetch jobs from JazzHR API only
      let jazzHRJobs: JazzHRJobWithApplicants[] = [];
      
      try {
        const { data: jobsData, error: jobsError } = await supabase.functions.invoke('jazzhr-api', {
          body: { 
            action: 'getJobs',
            params: searchTerm ? { title: searchTerm } : {}
          }
        });

        if (!jobsError && jobsData && jobsData.success !== false) {
          const jobs = Array.isArray(jobsData) ? jobsData : [jobsData];
          jazzHRJobs = jobs.filter(job => job && job.id);
          console.log('Fetched JazzHR jobs:', jazzHRJobs.length);

          // Fetch applicants for each job
          const jobsWithApplicants = await Promise.all(
            jazzHRJobs.map(async (job) => {
              try {
                const { data: applicantsData, error: applicantsError } = await supabase.functions.invoke('jazzhr-api', {
                  body: { 
                    action: 'getApplicants',
                    params: { job_id: job.id }
                  }
                });

                if (!applicantsError && applicantsData && applicantsData.success !== false) {
                  const applicants = Array.isArray(applicantsData) ? applicantsData : [applicantsData];
                  job.applicants = applicants.filter(app => app && app.id);
                } else {
                  job.applicants = [];
                }
              } catch (applicantErr) {
                console.warn(`Error fetching applicants for job ${job.title}:`, applicantErr);
                job.applicants = [];
              }
              return job;
            })
          );

          jazzHRJobs = jobsWithApplicants;
        } else {
          console.warn('JazzHR API call failed:', jobsError || 'No data returned');
          if (jobsData?.message) {
            console.warn('JazzHR API message:', jobsData.message);
          }
        }
      } catch (err) {
        console.warn('JazzHR API error:', err);
      }

      // Always fetch local database jobs to combine with JazzHR jobs
      let localJobs: JazzHRJobWithApplicants[] = [];
      try {
        let localJobsQuery = supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false });

        if (searchTerm) {
          localJobsQuery = localJobsQuery.or(`title.ilike.%${searchTerm}%,job_description.ilike.%${searchTerm}%`);
        }

        const { data: localJobsData, error: localError } = await localJobsQuery;
        
        if (!localError && localJobsData) {
          localJobs = localJobsData.map(job => ({
            id: job.id,
            title: job.title,
            description: job.job_description || '',
            department: job.company_name || '',
            city: job.location_name?.split(',')[0] || '',
            state: job.location_name?.split(',')[1]?.trim() || '',
            employment_type: job.work_type_name || 'Full-time',
            created_at: job.created_at,
            status: 'Open', // Ensure consistent status format
            applicants: []
          }));
        }
      } catch (localErr) {
        console.warn('Error fetching local jobs:', localErr);
      }

      // Combine JazzHR and local jobs with deduplication
      const combinedJobs = [...jazzHRJobs, ...localJobs];
      
      // Remove duplicates by title and company, and filter out sample/test jobs
      const uniqueJobs = combinedJobs.filter((job, index, array) => {
        // Filter out sample/test jobs
        if (job.title?.toLowerCase().includes('sample') || 
            job.title?.toLowerCase().includes('test') ||
            job.id?.toLowerCase().includes('sample')) {
          return false;
        }
        
        // Remove duplicates by checking if this is the first occurrence of this job
        return array.findIndex(j => 
          j.title?.toLowerCase() === job.title?.toLowerCase() && 
          (j.department?.toLowerCase() === job.department?.toLowerCase() || 
           j.company_name?.toLowerCase() === job.company_name?.toLowerCase())
        ) === index;
      });
      
      setJobs(uniqueJobs);
      setUseMockData(false);
      
      if (uniqueJobs.length === 0) {
        let filteredJobs = mockJobs;
        if (searchTerm) {
          filteredJobs = mockJobs.filter(job => 
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.city?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        setJobs(filteredJobs);
        setUseMockData(true);
        setError('Using demo data - API services temporarily unavailable');
      } else {
        // Show warning if only one source is working
        if (jazzHRJobs.length === 0 && localJobs.length > 0) {
          setError('JazzHR API temporarily unavailable - showing local jobs only');
        } else if (localJobs.length === 0 && jazzHRJobs.length > 0) {
          setError('Local database temporarily unavailable - showing JazzHR jobs only');
        }
      }
      
      console.log('Total unique jobs loaded:', uniqueJobs.length, '(', jazzHRJobs.length, 'JazzHR,', localJobs.length, 'local)');
      const totalApplicants = uniqueJobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0);
      console.log('Total applicants across all jobs:', totalApplicants);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
      
      // Fallback to mock data on error
      setJobs(mockJobs);
      setUseMockData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Auto-test API connection on load
    const testConnection = async () => {
      try {
        const { data } = await supabase.functions.invoke('jazzhr-api', {
          body: { action: 'testConnection', params: {} }
        });
        console.log('JazzHR Auto-Test:', data);
      } catch (error) {
        console.error('JazzHR Auto-Test failed:', error);
      }
    };
    
    testConnection();
  }, []);

  return {
    jobs,
    loading,
    error,
    useMockData,
    refetch: fetchJobs
  };
}