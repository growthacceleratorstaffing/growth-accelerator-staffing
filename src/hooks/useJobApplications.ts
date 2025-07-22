import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Interface for job application candidates - now based on JazzHR API
export interface JobApplicationCandidate {
  applicationId: string;
  jobTitle: string;
  jobReference: string;
  manual: boolean;
  source: string;
  rating: number;
  status: {
    statusId: number;
    name: string;
    active: boolean;
    rejected: boolean;
    default: boolean;
    defaultRejected: boolean;
    workflow: {
      stage: string;
      stageIndex: number;
      step: number;
      stepName: string;
      workflowId: number;
    };
  };
  candidate: {
    candidateId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: {
      street: string[];
      city: string;
      state: string;
      postalCode: string;
      country: string;
      countryCode: string;
    };
    skills?: string[];
    experienceYears?: number;
    currentCompany?: string;
    currentRole?: string;
    availability?: string;
    summary?: string;
    seeking?: string;
    salutation?: string;
    status?: {
      statusId: number;
      name: string;
      active: boolean;
      default: boolean;
    };
    rating?: string;
    created?: string;
    updated?: string;
  };
  job: {
    jobId: string;
    reference: string;
    title: string;
    summary?: string;
    description?: string;
    status?: {
      statusId: number;
      name: string;
      active: boolean;
      default: boolean;
    };
    salaryType?: string;
    salaryFrom?: number;
    salaryTo?: number;
    salaryCurrency?: string;
    salaryFrequency?: string;
    isRemunerationPackage?: boolean;
    primaryLocation?: {
      city: string;
      state: string;
      country: string;
      countryCode: string;
    };
    workType?: {
      workTypeId: number;
      name: string;
    };
    employmentType?: {
      employmentTypeId: number;
      name: string;
    };
    category?: {
      categoryId: number;
      name: string;
    };
    subCategory?: {
      subCategoryId: number;
      name: string;
    };
    owner?: {
      userId: number;
      firstName: string;
      lastName: string;
      email: string;
    };
    recruiter?: {
      userId: number;
      firstName: string;
      lastName: string;
      email: string;
    };
    published?: string;
    expires?: string;
    created?: string;
    updated?: string;
  };
  adSource?: string;
  note?: string;
  appliedDate?: string;
  updatedDate?: string;
  createdDate?: string;
}

// Mock data for fallback
const mockJobApplications: JobApplicationCandidate[] = [
  {
    applicationId: "mock_001",
    jobTitle: "Senior Software Engineer",
    jobReference: "MOCK-001",
    manual: false,
    source: "Direct Application",
    rating: 4,
    status: {
      statusId: 1,
      name: "Application Review",
      active: true,
      rejected: false,
      default: true,
      defaultRejected: false,
      workflow: {
        stage: "Application Review",
        stageIndex: 0,
        step: 1,
        stepName: "Initial Review",
        workflowId: 1
      }
    },
    candidate: {
      candidateId: "cand_001",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      address: {
        street: ["123 Main St"],
        city: "San Francisco",
        state: "CA",
        postalCode: "94102",
        country: "United States",
        countryCode: "US"
      },
      skills: ["JavaScript", "React", "Node.js", "Python"],
      experienceYears: 5,
      currentCompany: "Tech Innovations Inc",
      currentRole: "Software Engineer",
      availability: "2 weeks notice",
      summary: "Experienced full-stack developer with expertise in modern web technologies.",
      seeking: "Senior development role",
      created: "2024-01-15T10:30:00Z",
      updated: "2024-01-20T14:45:00Z"
    },
    job: {
      jobId: "job_001",
      reference: "SE-2024-001",
      title: "Senior Software Engineer",
      summary: "Join our engineering team to build scalable web applications",
      description: "We are looking for a senior software engineer...",
      salaryType: "annual",
      salaryFrom: 120000,
      salaryTo: 150000,
      salaryCurrency: "USD",
      salaryFrequency: "annual",
      primaryLocation: {
        city: "San Francisco",
        state: "CA",
        country: "United States",
        countryCode: "US"
      },
      workType: {
        workTypeId: 1,
        name: "Full-time"
      },
      employmentType: {
        employmentTypeId: 1,
        name: "Permanent"
      },
      category: {
        categoryId: 1,
        name: "Technology"
      },
      subCategory: {
        subCategoryId: 1,
        name: "Software Development"
      },
      owner: {
        userId: 1,
        firstName: "John",
        lastName: "Manager",
        email: "john.manager@company.com"
      },
      published: "2024-01-10T09:00:00Z",
      created: "2024-01-10T09:00:00Z",
      updated: "2024-01-15T16:30:00Z"
    },
    adSource: "Company Website",
    appliedDate: "2024-01-15T10:30:00Z",
    updatedDate: "2024-01-20T14:45:00Z",
    createdDate: "2024-01-15T10:30:00Z"
  }
];

export function useJobApplications() {
  const [applications, setApplications] = useState<JobApplicationCandidate[]>([]);
  const [talentPool, setTalentPool] = useState<JobApplicationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const { toast } = useToast();

  const fetchApplications = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch from JazzHR API only (no more JobAdder)
      let jazzHRApplications: JobApplicationCandidate[] = [];
      
      try {
        const { data, error: jazzHRError } = await supabase.functions.invoke('jazzhr-api', {
          body: { 
            action: 'getApplicants',
            params: searchTerm ? { name: searchTerm } : {}
          }
        });

        if (!jazzHRError && data) {
          const applicants = Array.isArray(data) ? data : [data];
          jazzHRApplications = applicants.filter(app => app && app.id).map((applicant, index) => ({
            applicationId: applicant.id,
            jobTitle: applicant.job_title || "General Application",
            jobReference: `JAZZ-${applicant.job_id || 'GENERAL'}`,
            manual: false,
            source: "JazzHR Application",
            rating: applicant.rating || 3,
            status: {
              statusId: 1,
              name: "Applied",
              active: true,
              rejected: false,
              default: true,
              defaultRejected: false,
              workflow: {
                stage: "Applied",
                stageIndex: 0,
                step: 1,
                stepName: "Application Submitted",
                workflowId: 1
              }
            },
            candidate: {
              candidateId: applicant.id,
              firstName: applicant.first_name || '',
              lastName: applicant.last_name || '',
              email: applicant.email || '',
              phone: applicant.prospect_phone || applicant.phone,
              address: applicant.city && applicant.state ? {
                street: [],
                city: applicant.city,
                state: applicant.state,
                postalCode: '',
                country: 'United States',
                countryCode: 'US'
              } : undefined,
              created: applicant.apply_date,
              updated: applicant.apply_date
            },
            job: {
              jobId: applicant.job_id || 'general',
              reference: applicant.job_id || 'GENERAL',
              title: applicant.job_title || 'General Application',
              primaryLocation: applicant.city && applicant.state ? {
                city: applicant.city,
                state: applicant.state,
                country: 'United States',
                countryCode: 'US'
              } : undefined
            },
            appliedDate: applicant.apply_date,
            updatedDate: applicant.apply_date,
            createdDate: applicant.apply_date
          }));
        }
      } catch (apiError) {
        console.warn('JazzHR API unavailable:', apiError);
        jazzHRApplications = mockJobApplications;
        setUseMockData(true);
        setError('Using demo data - JazzHR API unavailable');
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
          applicationId: `local_${candidate.id}`,
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
              stepName: candidate.interview_stage === 'pending' ? "Available for Opportunities" :
                       candidate.interview_stage === 'in_progress' ? "Interview In Progress" :
                       candidate.interview_stage === 'completed' ? "Interview Completed" :
                       candidate.interview_stage === 'passed' ? "Interview Passed" : "Available for Opportunities",
              workflowId: 1
            }
          },
          candidate: {
            candidateId: candidate.id,
            firstName: candidate.name?.split(' ')[0] || '',
            lastName: candidate.name?.split(' ').slice(1).join(' ') || '',
            email: candidate.email || '',
            phone: candidate.phone,
            currentCompany: candidate.company,
            currentRole: candidate.current_position,
            skills: Array.isArray(candidate.skills) ? candidate.skills as string[] : [],
            summary: `${candidate.current_position || 'Professional'} with experience at ${candidate.company || 'various companies'}`,
            created: candidate.created_at,
            updated: candidate.updated_at
          },
          job: {
            jobId: 'talent_pool',
            reference: 'TALENT_POOL',
            title: 'Talent Pool Entry',
            summary: 'Added directly to talent pool for future opportunities'
          },
          appliedDate: candidate.created_at,
          updatedDate: candidate.updated_at,
          createdDate: candidate.created_at
        }));
      } catch (localErr) {
        console.warn('Error fetching local candidates:', localErr);
      }

      // Combine JazzHR and local applications
      const allApplications = [...jazzHRApplications, ...localCandidates];
      
      // Separate applications from talent pool based on stage
      const activeApplications = allApplications.filter(app => 
        app.status.workflow.stage !== "Talent Pool" && 
        !app.manual
      );
      
      const talentPoolCandidates = allApplications.filter(app => 
        app.status.workflow.stage === "Talent Pool" || 
        app.manual ||
        app.status.workflow.stageIndex >= 3 // Advanced stages
      );

      console.log(`JazzHR Applications: ${jazzHRApplications.length}, Local Candidates: ${localCandidates.length}`);
      console.log(`Active Applications: ${activeApplications.length}, Talent Pool: ${talentPoolCandidates.length}`);

      setApplications(activeApplications);
      setTalentPool(talentPoolCandidates);
      
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to fetch application data');
      setApplications(mockJobApplications);
      setTalentPool([]);
      setUseMockData(true);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStage = async (applicationId: string, newStageId: number, notes?: string) => {
    try {
      // For JazzHR applications, we would need to implement the API call
      if (!applicationId.startsWith('local_')) {
        console.log('JazzHR application stage update not yet implemented');
        return;
      }

      // For local candidates, update in the database
      const candidateId = applicationId.replace('local_', '');
      const stageMapping: Record<number, string> = {
        1: 'pending',
        2: 'in_progress', 
        3: 'completed',
        4: 'passed',
        5: 'hired'
      };

      const newStage = stageMapping[newStageId] || 'pending';

      const { error } = await supabase
        .from('candidates')
        .update({ interview_stage: newStage as any })
        .eq('id', candidateId);

      if (error) {
        throw error;
      }

      // Refresh applications
      await fetchApplications();

      toast({
        title: "Application Updated",
        description: "Application stage has been updated successfully.",
      });
    } catch (err) {
      console.error('Error updating application stage:', err);
      toast({
        title: "Error",
        description: "Failed to update application stage.",
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  return {
    applications,
    talentPool,
    loading,
    error,
    useMockData,
    fetchApplications,
    updateApplicationStage,
    refetch: fetchApplications
  };
}