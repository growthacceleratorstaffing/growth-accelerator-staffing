import { useState, useEffect } from 'react';
import oauth2Manager from '@/lib/oauth2-manager';
import { supabase } from '@/integrations/supabase/client';

// Job Application interfaces based on API specification
export interface JobApplicationCandidate {
  applicationId: number;
  jobTitle?: string;
  jobReference?: string;
  manual: boolean;
  source?: string;
  rating?: number;
  status: {
    statusId: number;
    name: string;
    active: boolean;
    rejected: boolean;
    default: boolean;
    defaultRejected: boolean;
    workflow?: {
      stage: string;
      stageIndex: number;
      step: number;
      progress: string;
    };
  };
  review?: {
    stage: string;
    submittedAt?: string;
    submittedBy?: {
      userId: number;
      firstName: string;
      lastName: string;
      email: string;
    };
    reviewedAt?: string;
    reviewedBy?: any;
  };
  candidate: {
    candidateId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    mobile?: string;
    mobileNormalized?: string;
    contactMethod?: string;
    salutation?: string;
    unsubscribed?: boolean;
    address?: {
      street?: string[];
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      countryCode?: string;
    };
    status?: {
      statusId: number;
      name: string;
      active: boolean;
      default: boolean;
    };
    rating?: string;
    source?: string;
    seeking?: string;
  };
  job: {
    jobId: number;
    jobTitle: string;
    location?: {
      locationId: number;
      name: string;
      area?: {
        areaId: number;
        name: string;
      };
    };
    company?: {
      companyId: number;
      name: string;
      status?: {
        statusId: number;
        name: string;
        active: boolean;
        default: boolean;
      };
    };
  };
  owner?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt?: string;
  updatedBy?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedAt?: string;
}

interface JobApplicationsResponse {
  items: JobApplicationCandidate[];
  totalCount: number;
  links?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

class JobApplicationsAPI {
  private async getHeaders(): Promise<HeadersInit> {
    const accessToken = await oauth2Manager.getValidAccessToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  private async makeRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Handle 429 Too Many Requests with retry logic
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
        
        console.warn(`Rate limited (429). Waiting ${waitTime / 1000} seconds before retry...`);
        
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.makeRequest(url, options, retryCount + 1);
        } else {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getJobApplications(jobId: number, params?: {
    offset?: number;
    limit?: number;
  }): Promise<JobApplicationsResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.offset) searchParams.append('offset', params.offset.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const url = `https://api.jobadder.com/v2/jobs/${jobId}/applications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const headers = await this.getHeaders();
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching job applications:', error);
      throw error;
    }
  }

  async getActiveJobApplications(jobId: number, params?: {
    offset?: number;
    limit?: number;
  }): Promise<JobApplicationsResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.offset) searchParams.append('offset', params.offset.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const url = `https://api.jobadder.com/v2/jobs/${jobId}/applications/active${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const headers = await this.getHeaders();
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching active job applications:', error);
      throw error;
    }
  }

  async getAllJobApplications(params?: {
    offset?: number;
    limit?: number;
    activeOnly?: boolean;
  }): Promise<JobApplicationCandidate[]> {
    try {
      // First, get all jobs to fetch applications from each
      const jobsResponse = await fetch('https://api.jobadder.com/v2/jobs?limit=100', {
        headers: await this.getHeaders()
      });

      if (!jobsResponse.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const jobsData = await jobsResponse.json();
      const jobs = jobsData.items || [];

      // Fetch applications for each job
      const allApplications: JobApplicationCandidate[] = [];
      
      for (const job of jobs.slice(0, 10)) { // Limit to first 10 jobs to avoid too many API calls
        try {
          const applications = params?.activeOnly 
            ? await this.getActiveJobApplications(job.jobId, { limit: 50 })
            : await this.getJobApplications(job.jobId, { limit: 50 });
          
          allApplications.push(...applications.items);
        } catch (error) {
          console.warn(`Failed to fetch applications for job ${job.jobId}:`, error);
          // Continue with other jobs
        }
      }

      return allApplications;
    } catch (error) {
      console.error('Error fetching all job applications:', error);
      throw error;
    }
  }

  async updateApplicationStage(applicationId: number, statusId: number, notes?: string): Promise<JobApplicationCandidate> {
    try {
      // In JobAdder API, you typically update application status via PUT request
      const url = `https://api.jobadder.com/v2/jobapplications/${applicationId}`;
      
      const payload = {
        statusId: statusId,
        notes: notes
      };

      const headers = await this.getHeaders();
      const response = await this.makeRequest(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating application stage:', error);
      throw error;
    }
  }

  async createPlacementFromApplication(applicationId: number, placementData: {
    startDate?: string;
    endDate?: string;
    salary?: {
      rate: number;
      currency: string;
      ratePer: string;
    };
    workTypeId?: number;
    notes?: string;
  }): Promise<any> {
    try {
      // This would be the endpoint to create a placement from an application
      // In JobAdder, this might be done by updating the application to "Placed" status
      // and providing additional placement details
      const url = `https://api.jobadder.com/v2/jobapplications/${applicationId}/placement`;
      
      const headers = await this.getHeaders();
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(placementData),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating placement from application:', error);
      throw error;
    }
  }
}

// Mock data for fallback
const mockJobApplications: JobApplicationCandidate[] = [
  {
    applicationId: 1001,
    jobTitle: "Senior Frontend Developer",
    jobReference: "SFD-2024-001",
    manual: false,
    source: "Job Portal Application",
    rating: 5,
    status: {
      statusId: 1,
      name: "Application Review",
      active: true,
      rejected: false,
      default: true,
      defaultRejected: false,
      workflow: {
        stage: "Initial Review",
        stageIndex: 0,
        step: 1,
        progress: "Started"
      }
    },
    candidate: {
      candidateId: 5001,
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      mobile: "+1 (555) 123-4567",
      contactMethod: "Email",
      salutation: "Ms.",
      unsubscribed: false,
      address: {
        street: ["123 Tech Street"],
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "United States",
        countryCode: "US"
      },
      status: {
        statusId: 1,
        name: "Available",
        active: true,
        default: true
      },
      rating: "4.8",
      source: "LinkedIn",
      seeking: "Yes"
    },
    job: {
      jobId: 1,
      jobTitle: "Senior Frontend Developer",
      location: {
        locationId: 201,
        name: "San Francisco, CA",
        area: {
          areaId: 301,
          name: "Bay Area"
        }
      },
      company: {
        companyId: 101,
        name: "Tech Corp",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      }
    },
    createdAt: "2024-01-22T10:30:00Z",
    updatedAt: "2024-01-22T10:30:00Z"
  },
  {
    applicationId: 1002,
    jobTitle: "Product Manager",
    jobReference: "PM-2024-002",
    manual: false,
    source: "Company Website",
    rating: 4,
    status: {
      statusId: 2,
      name: "Interview Scheduled",
      active: true,
      rejected: false,
      default: false,
      defaultRejected: false,
      workflow: {
        stage: "Phone Interview",
        stageIndex: 1,
        step: 2,
        progress: "In Progress"
      }
    },
    candidate: {
      candidateId: 5002,
      firstName: "Michael",
      lastName: "Chen",
      email: "michael.chen@email.com",
      phone: "+1 (555) 987-6543",
      mobile: "+1 (555) 987-6543",
      contactMethod: "Phone",
      salutation: "Mr.",
      unsubscribed: false,
      address: {
        street: ["456 Business Ave"],
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "United States",
        countryCode: "US"
      },
      status: {
        statusId: 2,
        name: "Interviewing",
        active: true,
        default: false
      },
      rating: "4.9",
      source: "Company Website",
      seeking: "Yes"
    },
    job: {
      jobId: 2,
      jobTitle: "Product Manager",
      location: {
        locationId: 202,
        name: "New York, NY",
        area: {
          areaId: 302,
          name: "New York Metro"
        }
      },
      company: {
        companyId: 102,
        name: "Innovation Inc",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      }
    },
    createdAt: "2024-01-15T14:20:00Z",
    updatedAt: "2024-01-20T09:15:00Z"
  },
  {
    applicationId: 1003,
    jobTitle: "UX Designer",
    jobReference: "UXD-2024-003",
    manual: true,
    source: "Referral",
    rating: 5,
    status: {
      statusId: 3,
      name: "Offer Extended",
      active: true,
      rejected: false,
      default: false,
      defaultRejected: false,
      workflow: {
        stage: "Final Decision",
        stageIndex: 4,
        step: 5,
        progress: "Completed"
      }
    },
    candidate: {
      candidateId: 5003,
      firstName: "Emily",
      lastName: "Rodriguez",
      email: "emily.rodriguez@email.com",
      phone: "+1 (555) 456-7890",
      mobile: "+1 (555) 456-7890",
      contactMethod: "Email",
      salutation: "Ms.",
      unsubscribed: false,
      address: {
        street: ["789 Design Lane"],
        city: "Austin",
        state: "TX",
        postalCode: "73301",
        country: "United States",
        countryCode: "US"
      },
      status: {
        statusId: 1,
        name: "Available",
        active: true,
        default: true
      },
      rating: "4.7",
      source: "Dribbble",
      seeking: "Yes"
    },
    job: {
      jobId: 3,
      jobTitle: "UX Designer",
      location: {
        locationId: 203,
        name: "Remote"
      },
      company: {
        companyId: 103,
        name: "Design Studio",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      }
    },
    createdAt: "2024-01-19T09:15:00Z",
    updatedAt: "2024-01-25T16:30:00Z"
  }
];

export const jobApplicationsAPI = new JobApplicationsAPI();

export function useJobApplications() {
  const [applications, setApplications] = useState<JobApplicationCandidate[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplicationCandidate[]>([]);
  const [talentPool, setTalentPool] = useState<JobApplicationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchApplications = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch JobAdder applications
      let jobAdderApplications: JobApplicationCandidate[] = [];
      
      try {
        const response = await jobApplicationsAPI.getAllJobApplications({ 
          limit: 100,
          activeOnly: false 
        });
        jobAdderApplications = response;
      } catch (apiError) {
        console.warn('JobAdder API unavailable:', apiError);
        // Use mock data as fallback for JobAdder
        jobAdderApplications = mockJobApplications;
        setUseMockData(true);
        setError('Using demo data for JobAdder applications - API unavailable');
      }

      // Fetch local candidates from Supabase
      let localCandidates: JobApplicationCandidate[] = [];
      
      try {
        const { data: candidates, error: supabaseError } = await supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        // Convert local candidates to JobApplicationCandidate format
        localCandidates = (candidates || []).map((candidate, index) => ({
          applicationId: -1000 - index, // Negative IDs to distinguish from JobAdder
          jobTitle: candidate.current_position || "General Application",
          jobReference: `LOCAL-${candidate.id.slice(0, 8)}`,
          manual: true,
          source: "Manual Entry - Growth Accelerator",
          rating: 3,
          status: {
            statusId: 1,
            name: "Available",
            active: true,
            rejected: false,
            default: true,
            defaultRejected: false,
            workflow: {
              stage: "Talent Pool",
              stageIndex: 0,
              step: 1,
              progress: "Available"
            }
          },
          candidate: {
            candidateId: -1000 - index,
            firstName: candidate.name?.split(' ')[0] || "Unknown",
            lastName: candidate.name?.split(' ').slice(1).join(' ') || "",
            email: candidate.email,
            phone: candidate.phone || undefined,
            mobile: candidate.phone || undefined,
            contactMethod: "Email",
            address: candidate.location ? {
              city: candidate.location.split(',')[0]?.trim(),
              state: candidate.location.split(',')[1]?.trim(),
              country: "Netherlands"
            } : undefined,
            status: {
              statusId: 1,
              name: "Available",
              active: true,
              default: true
            },
            source: candidate.source_platform || "manual"
          },
          job: {
            jobId: -1,
            jobTitle: candidate.current_position || "General Application",
            location: {
              locationId: -1,
              name: candidate.location || "Netherlands"
            },
            company: {
              companyId: -1,
              name: candidate.company || "Growth Accelerator",
              status: {
                statusId: 1,
                name: "Active",
                active: true,
                default: true
              }
            }
          },
          createdAt: candidate.created_at,
          updatedAt: candidate.updated_at
        }));

        console.log(`Fetched ${localCandidates.length} local candidates from database`);
      } catch (supabaseError) {
        console.warn('Error fetching local candidates:', supabaseError);
      }

      // Apply search filter to job applications
      let filteredJobApplications = jobAdderApplications;
      if (searchTerm) {
        filteredJobApplications = jobAdderApplications.filter(app => 
          `${app.candidate.firstName} ${app.candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply search filter to talent pool
      let filteredTalentPool = localCandidates;
      if (searchTerm) {
        filteredTalentPool = localCandidates.filter(app => 
          `${app.candidate.firstName} ${app.candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Set separate data for job applications and talent pool
      setJobApplications(filteredJobApplications);
      setTalentPool(filteredTalentPool);
      
      // Keep combined view for backward compatibility
      const allApplications = [...filteredJobApplications, ...filteredTalentPool];
      setApplications(allApplications);
      
      console.log(`Job Applications: ${filteredJobApplications.length}, Talent Pool: ${filteredTalentPool.length}`);
      
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Error loading talent pool data');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const updateApplicationStage = async (applicationId: number, statusId: number, notes?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try API first
      const response = await jobApplicationsAPI.updateApplicationStage(applicationId, statusId, notes);
      // Update local state
      setApplications(prev => prev.map(app => 
        app.applicationId === applicationId 
          ? { ...app, status: response.status, updatedAt: new Date().toISOString() }
          : app
      ));
      return response;
    } catch (apiError) {
      console.warn('API update failed, using mock update:', apiError);
      
      // Mock update for demo
      setApplications(prev => prev.map(app => {
        if (app.applicationId === applicationId) {
          const statusNames: Record<number, string> = {
            1: "Application Review",
            2: "Phone Interview", 
            3: "Technical Interview",
            4: "Final Interview",
            5: "Offer Extended",
            6: "Placed",
            7: "Rejected",
            8: "Declined"
          };
          
          return {
            ...app,
            status: {
              ...app.status,
              statusId: statusId,
              name: statusNames[statusId] || "Unknown",
              workflow: {
                stage: statusNames[statusId] || "Unknown",
                stageIndex: statusId - 1,
                step: statusId,
                progress: statusId === 6 ? "Completed" : "In Progress"
              }
            },
            updatedAt: new Date().toISOString()
          };
        }
        return app;
      }));
      
      setError('Demo mode - Stage updated locally');
    } finally {
      setLoading(false);
    }
  };

  const createPlacementFromApplication = async (applicationId: number, placementData: any) => {
    setLoading(true);
    setError(null);

    try {
      // Try API first
      const response = await jobApplicationsAPI.createPlacementFromApplication(applicationId, placementData);
      
      // Update application to "Placed" status
      await updateApplicationStage(applicationId, 6);
      
      return response;
    } catch (apiError) {
      console.warn('API placement creation failed, using mock:', apiError);
      
      // Mock placement creation
      await updateApplicationStage(applicationId, 6);
      setError('Demo mode - Placement created locally');
    } finally {
      setLoading(false);
    }
  };

  return {
    applications,
    jobApplications,
    talentPool,
    loading,
    error,
    useMockData,
    refetch: fetchApplications,
    updateApplicationStage,
    createPlacementFromApplication
  };
}