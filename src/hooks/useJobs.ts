import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface JobAdderJob {
  adId: number;
  title: string;
  reference?: string;
  summary?: string;
  bulletPoints?: string[];
  description?: string;
  portal?: {
    salary?: {
      ratePer: string;
      rateLow?: number;
      rateHigh?: number;
      details?: string;
    };
    template?: string;
  };
  postedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  // Legacy structure for compatibility
  company?: {
    companyId: number;
    name: string;
  };
  location?: {
    locationId: number;
    name: string;
    area?: {
      areaId: number;
      name: string;
    };
  };
  workType?: {
    workTypeId: number;
    name: string;
  };
  salary?: {
    ratePer: string;
    rateLow?: number;
    rateHigh?: number;
    currency: string;
  };
  category?: {
    categoryId: number;
    name: string;
    subCategory?: {
      subCategoryId: number;
      name: string;
    };
  };
  postAt?: string;
  expireAt?: string;
  owner?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Mock data as fallback - updated to match Job Board API structure
const mockJobs: JobAdderJob[] = [
  {
    adId: 1,
    title: "Senior Frontend Developer",
    reference: "SFD-2024-001",
    summary: "Join our innovative team building cutting-edge web applications",
    bulletPoints: [
      "Work with React, TypeScript, and modern tools",
      "Collaborative team environment",
      "Growth opportunities"
    ],
    portal: {
      salary: {
        ratePer: "Year",
        rateLow: 120000,
        rateHigh: 160000,
        details: "Competitive salary with benefits"
      },
      template: "Premium"
    },
    postedAt: "2024-01-22T10:30:00Z",
    expiresAt: "2024-03-22T23:59:59Z",
    // Legacy fields for compatibility
    company: {
      companyId: 101,
      name: "Tech Corp"
    },
    location: {
      locationId: 201,
      name: "San Francisco, CA",
      area: {
        areaId: 301,
        name: "Bay Area"
      }
    },
    workType: {
      workTypeId: 1,
      name: "Full-time"
    }
  },
  {
    adId: 2,
    title: "Product Manager",
    reference: "PM-2024-002",
    summary: "Lead product strategy for our core platform",
    bulletPoints: [
      "Drive product roadmap and strategy",
      "Work with cross-functional teams",
      "Data-driven decision making"
    ],
    portal: {
      salary: {
        ratePer: "Year",
        rateLow: 140000,
        rateHigh: 180000,
        details: "Base salary plus equity"
      }
    },
    postedAt: "2024-01-15T14:20:00Z",
    expiresAt: "2024-03-15T23:59:59Z",
    company: {
      companyId: 102,
      name: "Innovation Inc"
    },
    location: {
      locationId: 202,
      name: "New York, NY",
      area: {
        areaId: 302,
        name: "New York Metro"
      }
    },
    workType: {
      workTypeId: 1,
      name: "Full-time"
    }
  },
  {
    adId: 3,
    title: "UX Designer",
    reference: "UXD-2024-003",
    summary: "Create beautiful and intuitive user experiences",
    bulletPoints: [
      "Design user-centered experiences",
      "Conduct user research",
      "Prototype and test designs"
    ],
    portal: {
      salary: {
        ratePer: "Year", 
        rateLow: 80000,
        rateHigh: 100000,
        details: "Remote-friendly position"
      }
    },
    postedAt: "2024-01-19T09:15:00Z",
    expiresAt: "2024-03-19T23:59:59Z",
    company: {
      companyId: 103,
      name: "Design Studio"
    },
    location: {
      locationId: 203,
      name: "Remote"
    },
    workType: {
      workTypeId: 2,
      name: "Contract"
    }
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
      // First, fetch local jobs from database
      let localJobsQuery = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        localJobsQuery = localJobsQuery.or(`title.ilike.%${searchTerm}%,job_description.ilike.%${searchTerm}%`);
      }

      const { data: localJobs, error: localError } = await localJobsQuery;
      
      if (localError) {
        console.warn('Error fetching local jobs:', localError);
      }

      // Transform local jobs to match JobAdderJob interface
      const transformedLocalJobs: JobAdderJob[] = (localJobs || []).map(job => ({
        adId: parseInt(job.id.slice(-8), 16), // Convert UUID to number for compatibility
        title: job.title,
        reference: `LOCAL-${job.id.slice(0, 8)}`,
        summary: job.job_description?.substring(0, 200) + '...' || '',
        bulletPoints: [],
        description: job.job_description || '',
        company: {
          companyId: parseInt(job.company_id || '0'),
          name: job.company_name || `Company ${job.company_id || 'Unknown'}`
        },
        location: {
          locationId: parseInt(job.location_id || '0'),
          name: job.location_name || `Location ${job.location_id || 'Unknown'}`
        },
        workType: {
          workTypeId: parseInt(job.work_type_id || '1'),
          name: job.work_type_name || getWorkTypeName(job.work_type_id)
        },
        salary: job.salary_rate_low || job.salary_rate_high ? {
          ratePer: job.salary_rate_per || 'Year',
          rateLow: job.salary_rate_low || undefined,
          rateHigh: job.salary_rate_high || undefined,
          currency: job.salary_currency || 'USD'
        } : undefined,
        postAt: job.created_at,
        expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        owner: {
          userId: 1,
          firstName: 'Local',
          lastName: 'Admin',
          email: 'admin@local.com'
        }
      }));

      // Try to fetch jobs from JobAdder API
      let jobAdderJobs: JobAdderJob[] = [];
      try {
        const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'jobboards',
            boardId: boardId,
            limit: 50,
            offset: 0,
            search: searchTerm
          }
        });

        if (!supabaseError && data?.items) {
          jobAdderJobs = data.items;
          console.log('Fetched JobAdder jobs:', jobAdderJobs.length);
        } else {
          console.warn('JobAdder API unavailable:', supabaseError);
        }
      } catch (err) {
        console.warn('JobAdder API error:', err);
      }

      // Combine local and JobAdder jobs
      const allJobs = [...transformedLocalJobs, ...jobAdderJobs];
      setJobs(allJobs);
      setUseMockData(false);
      
      if (jobAdderJobs.length === 0 && transformedLocalJobs.length === 0) {
        // Fallback to mock data only if no jobs found anywhere
        let filteredJobs = mockJobs;
        if (searchTerm) {
          filteredJobs = mockJobs.filter(job => 
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.location.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        setJobs(filteredJobs);
        setUseMockData(true);
        setError('Using demo data - No jobs found');
      }
      
      console.log('Total jobs loaded:', allJobs.length, '(', transformedLocalJobs.length, 'local,', jobAdderJobs.length, 'JobAdder)');
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