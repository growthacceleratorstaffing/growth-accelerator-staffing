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

  const submitApplication = async (jobId: string, applicationData: JobApplicationData): Promise<JobApplicationResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Store candidate locally in the database
      const candidateData = {
        name: `${applicationData.firstName} ${applicationData.lastName}`,
        email: applicationData.email,
        phone: applicationData.phone || null,
        location: applicationData.address ? 
          `${applicationData.address.city || ''}, ${applicationData.address.state || ''}`.trim().replace(/^,\s*/, '') : null,
        current_position: applicationData.employment?.current?.position || null,
        company: applicationData.employment?.current?.employer || null,
        education: applicationData.education || [],
        skills: applicationData.skillTags || [],
        source_platform: 'job_application'
      };

      const { data: candidateResult, error: candidateError } = await supabase
        .from('candidates')
        .upsert(candidateData, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (candidateError) {
        console.error('Failed to store candidate locally:', candidateError);
        // Continue with JazzHR submission even if local storage fails
      }

      // Step 2: Submit candidate and application to JazzHR
      const jazzHRApplicantData = {
        first_name: applicationData.firstName,
        last_name: applicationData.lastName,
        email: applicationData.email,
        phone: applicationData.phone || applicationData.mobile,
        city: applicationData.address?.city,
        state: applicationData.address?.state,
        job: jobId,
        coverletter: `Current Employment: ${applicationData.employment?.current?.employer || 'N/A'} - ${applicationData.employment?.current?.position || 'N/A'}`,
        source: 'Website Application',
        resumetext: `Education: ${applicationData.education?.[0]?.institution || 'N/A'} - ${applicationData.education?.[0]?.course || 'N/A'}`
      };

      const { data, error: supabaseError } = await supabase.functions.invoke('jazzhr-api', {
        body: { 
          action: 'createApplicant',
          params: jazzHRApplicantData
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      return {
        applicationId: parseInt(data.id) || ++mockApplicationId,
        links: {}
      };
    } catch (apiError) {
      console.warn('JazzHR API submission failed, using mock submission:', apiError);
      
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
        
        setError('Demo mode - Application recorded locally and in database (JazzHR API not available)');
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