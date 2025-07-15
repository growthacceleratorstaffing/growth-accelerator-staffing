import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface JobAdderApplicant {
  applicationId: number;
  jobId: number;
  candidate: {
    candidateId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  status: {
    statusId: number;
    name: string;
  };
  appliedAt: string;
  stage: string;
}

export interface JobAdderJob {
  id: string;
  title: string;
  description?: string;
  department?: string;
  city?: string;
  state?: string;
  employment_type?: string;
  created_at?: string;
  minimum_experience?: string;
  status?: string;
  hiring_lead?: string;
  // Add applicants array to jobs (people who applied to this specific job)
  applicants?: JobAdderApplicant[];
}

// Mock data as fallback - updated to match JazzHR structure
const mockJobs: JobAdderJob[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    description: "Join our innovative team building cutting-edge web applications",
    department: "Engineering",
    city: "San Francisco",
    state: "CA",
    employment_type: "Full-time",
    created_at: "2024-01-22T10:30:00Z",
    hiring_lead: "John Smith"
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
    hiring_lead: "Sarah Johnson"
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
    hiring_lead: "Mike Chen"
  }
];

export function useJobs() {
  const [jobs, setJobs] = useState<JobAdderJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchJobs = async (searchTerm?: string, boardId: string = '8734') => {
    setLoading(true);
    setError(null);

    try {
      // Fetch jobs from JobAdder JobBoard (primary source)
      let jobAdderJobs: JobAdderJob[] = [];
      try {
        // Get current user ID for JazzHR API
        try {
          // Fetch jobs from JazzHR
          const { data: jobsData, error: jobsError } = await supabase.functions.invoke('jazzhr-api', {
            body: { 
              endpoint: 'jobs',
              limit: 50,
              offset: 0,
              search: searchTerm
            }
          });

          if (!jobsError && jobsData?.data) {
            jobAdderJobs = jobsData.data;
            console.log('Fetched JazzHR jobs:', jobAdderJobs.length);

            // For each job, fetch related applicants (people who applied to this job)
            const jobsWithApplicants = await Promise.all(
              jobAdderJobs.map(async (job) => {
                try {
                  const { data: applicantsData, error: applicantsError } = await supabase.functions.invoke('jazzhr-api', {
                    body: { 
                      endpoint: 'applicants',
                      jobId: job.id?.toString(),
                      limit: 100,
                      offset: 0
                    }
                  });

                  if (!applicantsError && applicantsData?.data) {
                    job.applicants = applicantsData.data;
                    console.log(`Job ${job.title} has ${job.applicants.length} applicants`);
                  } else {
                    job.applicants = [];
                    console.warn(`No applicants found for job ${job.title}:`, applicantsError);
                  }
                } catch (applicantErr) {
                  console.warn(`Error fetching applicants for job ${job.title}:`, applicantErr);
                  job.applicants = [];
                }
                return job;
              })
            );

            jobAdderJobs = jobsWithApplicants;
          } else {
            console.warn('JazzHR API call failed:', jobsError);
          }
        } catch (err) {
          console.warn('JazzHR API error:', err);
        }
      } catch (err) {
        console.warn('JazzHR API error:', err);
      }

      // Also fetch local jobs from database as backup
      let localJobs: JobAdderJob[] = [];
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
          // Transform local jobs to match JobAdderJob interface
          localJobs = localJobsData.map(job => ({
            id: job.id,
            title: job.title,
            description: job.job_description || '',
            department: job.company_name || 'Company',
            city: job.location_name?.split(',')[0] || '',
            state: job.location_name?.split(',')[1]?.trim() || '',
            employment_type: job.work_type_name || 'Full-time',
            created_at: job.created_at,
            applicants: [] // No applicants for local jobs
          }));
        }
      } catch (localErr) {
        console.warn('Error fetching local jobs:', localErr);
      }

      // Use JobAdder jobs as primary, local jobs as secondary
      const allJobs = [...jobAdderJobs, ...localJobs];
      setJobs(allJobs);
      setUseMockData(false);
      
      if (allJobs.length === 0) {
        // Fallback to mock data only if no jobs found anywhere
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
        setError('Using demo data - Configure JazzHR API to see real jobs');
      }
      
      console.log('Total jobs loaded:', allJobs.length, '(', jobAdderJobs.length, 'JobBoard,', localJobs.length, 'local)');
      const totalApplicants = allJobs.reduce((sum, job) => sum + (job.applicants?.length || 0), 0);
      console.log('Total applicants across all jobs:', totalApplicants);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get work type name
  const getWorkTypeName = (workTypeId: string) => {
    const workTypeMap: { [key: string]: string } = {
      "1": "Full-time",
      "2": "Part-time", 
      "3": "Contract",
      "4": "Freelance",
      "5": "Internship"
    };
    return workTypeMap[workTypeId] || "Full-time";
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return {
    jobs,
    loading,
    error,
    useMockData,
    refetch: fetchJobs
  };
}