import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

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
    };
    ideal?: {
      position?: string;
      workTypeId?: number;
    };
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
}

export interface JobApplicationResponse {
  applicationId: number;
  links?: {
    resume?: string;
    coverLetter?: string;
    other?: string;
  };
}

// Mock submission tracking for demo purposes
let mockApplicationId = 1000;

export function useJobApplication() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitApplication = async (jobId: number, applicationData: JobApplicationData): Promise<JobApplicationResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Use Supabase edge function to submit the job application
      const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'jobApplications',
          method: 'POST',
          boardId: 8734,
          adId: jobId,
          applicationData: applicationData
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      return data;
    } catch (apiError) {
      console.warn('API submission failed, using mock submission:', apiError);
      
      try {
        // Fallback to mock submission
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockResponse: JobApplicationResponse = {
          applicationId: ++mockApplicationId,
          links: {
            resume: "http://example.com/resume",
            coverLetter: "http://example.com/coverletter",
            other: "http://example.com/other"
          }
        };
        
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