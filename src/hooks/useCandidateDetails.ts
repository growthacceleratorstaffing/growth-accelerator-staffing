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

  const fetchCandidateDetails = async (candidateId: number): Promise<CandidateDetails> => {
    setLoading(true);
    setError(null);

    try {
      // Use Supabase edge function to get candidate details from JobAdder
      const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'candidates',
          method: 'GET',
          candidateId: candidateId
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setCandidateDetails(data);
      return data;
    } catch (apiError) {
      console.warn('JobAdder API unavailable, using mock data:', apiError);
      
      // Fallback to mock data
      const mockCandidate: CandidateDetails = {
        candidateId: candidateId,
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@email.com",
        phone: "+1 (555) 123-4567",
        mobile: "+1 (555) 123-4567",
        address: {
          street: ["123 Main Street"],
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
        rating: "4.5",
        source: "LinkedIn",
        seeking: "Yes",
        employment: {
          current: {
            employer: "Tech Company Inc.",
            position: "Senior Developer",
            startDate: "2022-01-15"
          },
          history: [
            {
              employer: "Previous Corp",
              position: "Junior Developer",
              startDate: "2020-06-01",
              endDate: "2021-12-31"
            }
          ]
        },
        education: [
          {
            institution: "University of Technology",
            course: "Computer Science",
            date: "2020",
            level: "Bachelor's Degree"
          }
        ],
        skills: ["JavaScript", "React", "TypeScript", "Node.js", "Python"],
        notes: [
          {
            noteId: 1,
            text: "Strong technical background, excellent communication skills.",
            createdAt: "2024-01-20T10:30:00Z",
            createdBy: {
              userId: 100,
              firstName: "Recruiter",
              lastName: "Name"
            }
          }
        ],
        attachments: [
          {
            attachmentId: 1,
            fileName: "resume.pdf",
            fileType: "application/pdf",
            uploadedAt: "2024-01-15T09:00:00Z"
          }
        ]
      };
      
      setCandidateDetails(mockCandidate);
      setError('Demo mode - Using sample candidate data');
      return mockCandidate;
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