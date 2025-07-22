import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

// Candidate interfaces based on JobAdder API specification
export interface JobAdderCandidate {
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
  summary?: string;
  skills?: string[];
  experienceYears?: number;
  currentRole?: string;
  currentCompany?: string;
  availability?: string;
  created?: string;
  updated?: string;
}


export function useCandidates() {
  const [candidates, setCandidates] = useState<JobAdderCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from edge function first
      const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'candidates',
          limit: 100,
          search: searchTerm
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setCandidates(data.items || data || []);
    } catch (err) {
      console.warn('JobAdder API unavailable, trying local candidates:', err);
      
      // Try to fetch from local candidates table as fallback
      try {
        let query = supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false });

        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,current_position.ilike.%${searchTerm}%`);
        }

        const { data: localCandidates, error: localError } = await query;

        if (localError) {
          throw localError;
        }

        // Transform local candidates to match JobAdder format
        const transformedCandidates: JobAdderCandidate[] = (localCandidates || []).map(candidate => ({
          candidateId: parseInt(candidate.id) || 0,
          firstName: candidate.name?.split(' ')[0] || '',
          lastName: candidate.name?.split(' ').slice(1).join(' ') || '',
          email: candidate.email || '',
          phone: candidate.phone || undefined,
          source: candidate.source_platform || 'Local',
          currentRole: candidate.current_position || undefined,
          currentCompany: candidate.company || undefined,
          created: candidate.created_at || undefined,
          updated: candidate.updated_at || undefined,
          skills: Array.isArray(candidate.skills) ? candidate.skills as string[] : [],
          experienceYears: candidate.experience_years || undefined
        }));

        setCandidates(transformedCandidates);
      } catch (localErr) {
        console.error('Failed to fetch local candidates:', localErr);
        setCandidates([]);
        setError('Unable to load candidates data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  return {
    candidates,
    loading,
    error,
    refetch: fetchCandidates
  };
}