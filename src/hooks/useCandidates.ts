import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

// Candidate interfaces based on JazzHR API specification
export interface JazzHRCandidate {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  prospect_phone?: string;
  city?: string;
  state?: string;
  apply_date?: string;
  job_id?: string;
  job_title?: string;
  status?: {
    id: string;
    name: string;
  };
  rating?: number;
  source?: string;
  job?: {
    id: string;
    title: string;
  };
  stage?: string; // Add stage for Kanban
}

export function useCandidates() {
  const [candidates, setCandidates] = useState<JazzHRCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from JazzHR API first
      const { data, error: supabaseError } = await supabase.functions.invoke('jazzhr-api', {
        body: { 
          action: 'getApplicants',
          params: searchTerm ? { name: searchTerm } : {}
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const jazzHRCandidates = Array.isArray(data) ? data : [data];
      setCandidates(jazzHRCandidates.filter(candidate => candidate && candidate.id));
      console.log(`Fetched ${jazzHRCandidates.length} candidates from JazzHR`);
    } catch (err) {
      console.warn('JazzHR API unavailable, trying local candidates:', err);
      
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

        // Transform local candidates to match JazzHR format
        const transformedCandidates: JazzHRCandidate[] = (localCandidates || []).map(candidate => ({
          id: candidate.id,
          first_name: candidate.name?.split(' ')[0] || '',
          last_name: candidate.name?.split(' ').slice(1).join(' ') || '',
          email: candidate.email || '',
          phone: candidate.phone || undefined,
          source: candidate.source_platform || 'Local',
          apply_date: candidate.created_at?.split('T')[0] || undefined,
          stage: candidate.interview_stage as any || 'pending'
        }));

        setCandidates(transformedCandidates);
        console.log(`Fetched ${transformedCandidates.length} local candidates`);
      } catch (localErr) {
        console.error('Error fetching local candidates:', localErr);
        setError('Failed to fetch candidates from both JazzHR and local database');
        setCandidates([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateCandidateStage = async (candidateId: string, newStage: string) => {
    try {
      // For JazzHR candidates (prospect IDs), we would need to implement JazzHR API update
      // For now, we'll only update local candidates
      if (candidateId.startsWith('prospect_')) {
        console.log('JazzHR candidate stage update not yet implemented');
        return;
      }

      // Update local candidate
      const { error } = await supabase
        .from('candidates')
        .update({ interview_stage: newStage as any })
        .eq('id', candidateId);

      if (error) {
        throw error;
      }

      // Update local state
      setCandidates(prev => prev.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, stage: newStage }
          : candidate
      ));
    } catch (err) {
      console.error('Error updating candidate stage:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  return {
    candidates,
    loading,
    error,
    fetchCandidates,
    updateCandidateStage,
    refetch: fetchCandidates
  };
}