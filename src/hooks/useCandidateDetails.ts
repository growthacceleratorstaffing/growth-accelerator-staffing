import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface CandidateDetails {
  candidateId: number;
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
  employment?: {
    current?: {
      employer?: string;
      position?: string;
      startDate?: string;
      endDate?: string;
    };
    history?: Array<{
      employer: string;
      position: string;
      startDate?: string;
      endDate?: string;
    }>;
  };
  education?: Array<{
    institution: string;
    course: string;
    date?: string;
    level?: string;
  }>;
  skills?: string[];
  notes?: Array<{
    noteId: number;
    text: string;
    createdAt: string;
    createdBy?: {
      userId: number;
      firstName: string;
      lastName: string;
    };
  }>;
  attachments?: Array<{
    attachmentId: number;
    fileName: string;
    fileType: string;
    url?: string;
    uploadedAt: string;
  }>;
}

export function useCandidateDetails() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<CandidateDetails | null>(null);

  const fetchCandidateDetails = async (candidateId: number | string): Promise<CandidateDetails | null> => {
    setLoading(true);
    setError(null);

    try {
      // Use Supabase edge function to get candidate details from JazzHR
      const { data, error: supabaseError } = await supabase.functions.invoke('jazzhr-api', {
        body: { 
          action: 'getApplicant',
          params: { applicant_id: candidateId }
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setCandidateDetails(data);
      return data;
    } catch (apiError) {
      console.warn('JazzHR API unavailable:', apiError);
      setError('Unable to load candidate details');
      setCandidateDetails(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearCandidateDetails = () => {
    setCandidateDetails(null);
    setError(null);
  };

  return {
    candidateDetails,
    loading,
    error,
    fetchCandidateDetails,
    clearCandidateDetails
  };
}