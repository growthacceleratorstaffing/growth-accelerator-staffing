import { useState, useEffect } from 'react';
import oauth2Manager from '@/lib/oauth2-manager';
import { useToast } from "@/hooks/use-toast";
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
    applicationId: 1004,
    jobTitle: "Data Scientist",
    jobReference: "DS-2024-004",
    manual: false,
    source: "Company Website",
    rating: 4,
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
      candidateId: 5004,
      firstName: "David",
      lastName: "Park",
      email: "david.park@email.com",
      phone: "+1 (555) 234-5678",
      mobile: "+1 (555) 234-5678",
      contactMethod: "Email",
      salutation: "Mr.",
      unsubscribed: false,
      address: {
        street: ["456 Data Drive"],
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
        country: "United States",
        countryCode: "US"
      },
      status: {
        statusId: 1,
        name: "Available",
        active: true,
        default: true
      },
      rating: "4.6",
      source: "Indeed",
      seeking: "Yes"
    },
    job: {
      jobId: 4,
      jobTitle: "Data Scientist",
      location: {
        locationId: 204,
        name: "Seattle, WA",
        area: {
          areaId: 304,
          name: "Pacific Northwest"
        }
      },
      company: {
        companyId: 104,
        name: "DataFlow Inc",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      }
    },
    createdAt: "2024-01-25T14:15:00Z",
    updatedAt: "2024-01-25T14:15:00Z"
  },
  {
    applicationId: 1005,
    jobTitle: "Backend Developer",
    jobReference: "BD-2024-005",
    manual: false,
    source: "LinkedIn",
    rating: 4,
    status: {
      statusId: 1,
      name: "Submitted",
      active: true,
      rejected: false,
      default: true,
      defaultRejected: false,
      workflow: {
        stage: "Pending Review",
        stageIndex: 0,
        step: 1,
        progress: "Submitted"
      }
    },
    candidate: {
      candidateId: 5005,
      firstName: "Lisa",
      lastName: "Wong",
      email: "lisa.wong@email.com",
      phone: "+1 (555) 345-6789",
      mobile: "+1 (555) 345-6789",
      contactMethod: "Email",
      salutation: "Ms.",
      unsubscribed: false,
      address: {
        street: ["789 Code Ave"],
        city: "Portland",
        state: "OR",
        postalCode: "97201",
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
      source: "LinkedIn",
      seeking: "Yes"
    },
    job: {
      jobId: 5,
      jobTitle: "Backend Developer",
      location: {
        locationId: 205,
        name: "Portland, OR",
        area: {
          areaId: 305,
          name: "Pacific Northwest"
        }
      },
      company: {
        companyId: 105,
        name: "CloudTech Solutions",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      }
    },
    createdAt: "2024-01-28T11:20:00Z",
    updatedAt: "2024-01-28T11:20:00Z"
  },
  {
    applicationId: 1006,
    jobTitle: "DevOps Engineer",  
    jobReference: "DO-2024-006",
    manual: false,
    source: "Glassdoor",
    rating: 5,
    status: {
      statusId: 1,
      name: "New",
      active: true,
      rejected: false,
      default: true,
      defaultRejected: false,
      workflow: {
        stage: "New Application",
        stageIndex: 0,
        step: 1,
        progress: "New"
      }
    },
    candidate: {
      candidateId: 5006,
      firstName: "Alex",
      lastName: "Thompson",
      email: "alex.thompson@email.com",
      phone: "+1 (555) 456-7890",
      mobile: "+1 (555) 456-7890",
      contactMethod: "Email",
      salutation: "Mr.",
      unsubscribed: false,
      address: {
        street: ["321 DevOps Lane"],
        city: "Denver",
        state: "CO",
        postalCode: "80201",
        country: "United States",
        countryCode: "US"
      },
      status: {
        statusId: 1,
        name: "Available",
        active: true,
        default: true
      },
      rating: "4.9",
      source: "Glassdoor",
      seeking: "Yes"
    },
    job: {
      jobId: 6,
      jobTitle: "DevOps Engineer",
      location: {
        locationId: 206,
        name: "Denver, CO",
        area: {
          areaId: 306,
          name: "Rocky Mountains"
        }
      },
      company: {
        companyId: 106,
        name: "Infrastructure Plus",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      }
    },
    createdAt: "2024-01-30T16:45:00Z",
    updatedAt: "2024-01-30T16:45:00Z"
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
  const { toast } = useToast();

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

      // Fetch local candidates from Supabase - include all candidates
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
            statusId: candidate.interview_stage === 'pending' ? 1 :
                     candidate.interview_stage === 'in_progress' ? 2 : 
                     candidate.interview_stage === 'completed' ? 4 :
                     candidate.interview_stage === 'passed' ? 5 : 1,
            name: candidate.interview_stage === 'pending' ? "Available" :
                  candidate.interview_stage === 'in_progress' ? "Interview In Progress" :
                  candidate.interview_stage === 'completed' ? "Interview Completed" :
                  candidate.interview_stage === 'passed' ? "Interview Passed" : "Available",
            active: true,
            rejected: candidate.interview_stage === 'failed',
            default: candidate.interview_stage === 'pending',
            defaultRejected: false,
            workflow: {
              stage: candidate.interview_stage === 'pending' ? "Talent Pool" :
                     candidate.interview_stage === 'in_progress' ? "Interview In Progress" :
                     candidate.interview_stage === 'completed' ? "Interview Completed" :
                     candidate.interview_stage === 'passed' ? "Interview Passed" : "Talent Pool",
              stageIndex: candidate.interview_stage === 'pending' ? 0 :
                         candidate.interview_stage === 'in_progress' ? 1 :
                         candidate.interview_stage === 'completed' ? 2 :
                         candidate.interview_stage === 'passed' ? 3 : 0,
              step: candidate.interview_stage === 'pending' ? 1 :
                   candidate.interview_stage === 'in_progress' ? 2 :
                   candidate.interview_stage === 'completed' ? 3 :
                   candidate.interview_stage === 'passed' ? 4 : 1,
              progress: candidate.interview_stage === 'passed' ? "Completed" : "Available"
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

      // Separate job applications by stage - make initial filter less restrictive  
      const advancedApplications = jobAdderApplications.filter(app => {
        const statusName = app.status.name.toLowerCase();
        console.log(`Checking advanced application status: "${statusName}"`);
        // These advanced stages go to talent pool
        return statusName.includes('interview') ||
               statusName.includes('offer') ||
               statusName.includes('placed') ||
               statusName.includes('shortlist') ||
               statusName.includes('on hold') ||
               statusName.includes('technical') ||
               statusName.includes('final');
      });
      
      const initialApplications = jobAdderApplications.filter(app => {
        const statusName = app.status.name.toLowerCase();
        console.log(`Checking initial application status: "${statusName}"`);
        // All other stages are initial applicants (not in advanced list)
        return !advancedApplications.some(advApp => advApp.applicationId === app.applicationId);
      });

      console.log(`JobAdder Applications Split: ${initialApplications.length} initial, ${advancedApplications.length} advanced`);

      // Separate local candidates by stage - only truly advanced candidates go to talent pool
      const localAdvancedCandidates = localCandidates.filter(candidate => 
        candidate.status.name !== "Available" && 
        (candidate.status.name.includes("Interview") || 
         candidate.status.name.includes("Passed") || 
         candidate.status.name.includes("Completed"))
      );
      
      const localInitialCandidates = localCandidates.filter(candidate =>
        candidate.status.name === "Available"
      );

      // ONLY advanced applications and advanced local candidates go to talent pool
      const allTalentPoolCandidates = [...advancedApplications, ...localAdvancedCandidates];
      
      // ONLY initial applications and initial local candidates go to applicants
      const allInitialApplications = [...initialApplications, ...localInitialCandidates];

      // Apply search filter to initial job applications (including local initial)
      let filteredJobApplications = allInitialApplications;
      if (searchTerm) {
        filteredJobApplications = allInitialApplications.filter(app => 
          `${app.candidate.firstName} ${app.candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.job.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply search filter to talent pool
      let filteredTalentPool = allTalentPoolCandidates;
      if (searchTerm) {
        filteredTalentPool = allTalentPoolCandidates.filter(app => 
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
      
      console.log(`Total applications displayed: ${filteredJobApplications.length} applicants (${initialApplications.length} JobAdder + ${localInitialCandidates.length} local), ${filteredTalentPool.length} talent pool (${advancedApplications.length} advanced + ${localAdvancedCandidates.length} local advanced)`);
      
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

    const statusNames: Record<number, string> = {
      1: "Application Review",
      2: "Phone Interview", 
      3: "Technical Interview",
      4: "Final Interview",
      5: "Placed",
      6: "Offer Extended",
      7: "Rejected",
      8: "Declined"
    };

    try {
      console.log(`Updating application ${applicationId} to status ${statusId} (${statusNames[statusId]})`);
      
      // For positive application IDs, try to sync with JobAdder API
      if (applicationId > 0) {
        try {
          const response = await jobApplicationsAPI.updateApplicationStage(applicationId, statusId, notes);
          console.log('JobAdder API updated successfully:', response);
        } catch (apiError) {
          console.warn('JobAdder API update failed:', apiError);
          // Continue with local update even if API fails
        }
      }
      // For negative application IDs (local candidates), update the database
      else if (applicationId < 0) {
        try {
          // Map statusId to interview_stage enum
          const interviewStageMap: Record<number, 'pending' | 'in_progress' | 'completed' | 'passed' | 'failed'> = {
            1: "pending",
            2: "in_progress", 
            3: "in_progress",
            4: "completed",
            5: "passed", // Placed = passed (step 5)
            6: "completed", // Offer Extended
            7: "failed",
            8: "failed"
          };
          
          const newInterviewStage = interviewStageMap[statusId] || "pending";
          
          // Find the actual application to get the candidate ID
          const currentApp = applications.find(app => app.applicationId === applicationId) ||
                            jobApplications.find(app => app.applicationId === applicationId) ||
                            talentPool.find(app => app.applicationId === applicationId);
          
          if (currentApp && currentApp.candidate.email) {
            // Update candidate in database by email (most reliable identifier)
            const { error: updateError } = await supabase
              .from('candidates')
              .update({ 
                interview_stage: newInterviewStage,
                updated_at: new Date().toISOString()
              })
              .eq('email', currentApp.candidate.email);
              
            if (updateError) {
              console.warn('Failed to update local candidate:', updateError);
            } else {
              console.log(`Updated local candidate ${currentApp.candidate.email} to stage: ${newInterviewStage}`);
            }
          }
        } catch (dbError) {
          console.warn('Error updating local candidate:', dbError);
        }
      }
      
      // Update all local state arrays
      const updateApplication = (app: any) => {
        if (app.applicationId === applicationId) {
          const updatedApp = {
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
          console.log(`Updated application ${applicationId} locally:`, updatedApp.status);
          return updatedApp;
        }
        return app;
      };
      
      // Update all arrays
      setApplications(prev => prev.map(updateApplication));
      setJobApplications(prev => prev.map(updateApplication));
      setTalentPool(prev => prev.map(updateApplication));
      
      // Trigger a refetch to get updated categorization after a short delay
      setTimeout(() => {
        console.log('Triggering refetch to update categorization...');
        fetchApplications();
      }, 1000);
      
      toast({
        title: "Stage Updated!",
        description: `Application moved to "${statusNames[statusId]}".`,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating application stage:', error);
      setError('Failed to update application stage');
      toast({
        title: "Error",
        description: "Failed to update application stage.",
        variant: "destructive"
      });
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