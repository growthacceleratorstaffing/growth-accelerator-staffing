import { useState } from 'react';
import oauth2Manager from '@/lib/oauth2-manager';

export interface JobApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: {
    street?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  employment?: {
    current?: {
      employer?: string;
      position?: string;
      workTypeId?: number;
      salary?: {
        ratePer: string;
        rate: number;
        currency: string;
      };
    };
    ideal?: {
      position?: string;
      workTypeId?: number;
      salary?: {
        ratePer: string;
        rateLow: number;
        rateHigh: number;
        currency: string;
      };
    };
    history?: Array<{
      employer: string;
      position: string;
      start: string;
      end: string;
      description?: string;
    }>;
  };
  availability?: {
    immediate?: boolean;
    relative?: {
      period: number;
      unit: string;
    };
    date?: string;
  };
  education?: Array<{
    institution: string;
    course: string;
    date: string;
  }>;
  skillTags?: string[];
  custom?: any;
}

export interface JobApplicationResponse {
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
  candidate: {
    candidateId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    mobile?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Mock submission tracking for demo purposes
let mockApplicationId = 1000;
const mockApplications: Record<number, JobApplicationResponse> = {};

class JobApplicationAPI {
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
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000; // Exponential backoff if no Retry-After
        
        console.warn(`Rate limited (429). Waiting ${waitTime / 1000} seconds before retry...`);
        
        // Only retry up to 3 times
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

  async submitJobApplication(jobId: number, applicationData: JobApplicationData): Promise<JobApplicationResponse> {
    try {
      const url = `https://api.jobadder.com/v2/jobboards/8734/jobads/${jobId}/applications`;
      
      // Prepare the payload according to JobAdder API specification
      const payload = {
        source: "Job Portal Application",
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        email: applicationData.email,
        phone: applicationData.phone,
        mobile: applicationData.mobile,
        address: applicationData.address,
        employment: applicationData.employment,
        availability: applicationData.availability,
        education: applicationData.education,
        skillTags: applicationData.skillTags,
        custom: applicationData.custom
      };

      const headers = await this.getHeaders();
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting job application:', error);
      throw error;
    }
  }

  // Mock submission for demo/fallback purposes
  async submitMockApplication(jobId: number, applicationData: JobApplicationData): Promise<JobApplicationResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockResponse: JobApplicationResponse = {
      applicationId: ++mockApplicationId,
      jobTitle: `Job ${jobId}`,
      jobReference: `REF-${jobId}-${Date.now()}`,
      manual: false,
      source: "Job Portal Application",
      rating: null,
      status: {
        statusId: 1,
        name: "Submitted",
        active: true,
        rejected: false,
        default: true,
        defaultRejected: false,
        workflow: {
          stage: "Application Review",
          stageIndex: 0,
          step: 1,
          progress: "Started"
        }
      },
      candidate: {
        candidateId: mockApplicationId + 5000,
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        email: applicationData.email,
        phone: applicationData.phone,
        mobile: applicationData.mobile
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in mock database
    mockApplications[mockResponse.applicationId] = mockResponse;
    
    console.log('Mock application submitted:', mockResponse);
    return mockResponse;
  }
}

const jobApplicationAPI = new JobApplicationAPI();

export function useJobApplication() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitApplication = async (jobId: number, applicationData: JobApplicationData): Promise<JobApplicationResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Try to submit to JobAdder API first
      const response = await jobApplicationAPI.submitJobApplication(jobId, applicationData);
      return response;
    } catch (apiError) {
      console.warn('JobAdder API submission failed, using mock submission:', apiError);
      
      try {
        // Fallback to mock submission
        const mockResponse = await jobApplicationAPI.submitMockApplication(jobId, applicationData);
        setError('Demo mode - Application recorded locally');
        return mockResponse;
      } catch (mockError) {
        setError('Failed to submit application');
        throw mockError;
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    submitApplication,
    loading,
    error
  };
}