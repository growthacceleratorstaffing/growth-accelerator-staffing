import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface PlacementDetails {
  placementId: number;
  candidate: {
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
    };
    rating?: string;
    source?: string;
    skills?: string[];
    employment?: {
      current?: {
        employer?: string;
        position?: string;
      }[];
    };
  };
  job: {
    jobId: number;
    jobTitle: string;
    location?: {
      locationId: number;
      name: string;
    };
    company?: {
      companyId: number;
      name: string;
    };
    contact?: {
      contactId: number;
      firstName: string;
      lastName: string;
      email: string;
      position?: string;
    };
  };
  status: {
    statusId: number;
    name: string;
    active: boolean;
    default: boolean;
  };
  workType?: {
    workTypeId: number;
    name: string;
  };
  salary?: {
    rate: number;
    currency: string;
    ratePer: string;
  };
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  owner?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function usePlacementDetails() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placementDetails, setPlacementDetails] = useState<PlacementDetails | null>(null);

  const fetchPlacementDetails = async (placementId: number): Promise<PlacementDetails> => {
    setLoading(true);
    setError(null);

    try {
      // Use Supabase edge function to get placement details from JobAdder
      const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'placements',
          method: 'GET',
          placementId: placementId
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setPlacementDetails(data);
      return data;
    } catch (apiError) {
      console.warn('JobAdder API unavailable, using mock data:', apiError);
      
      // Fallback to mock data
      const mockPlacement: PlacementDetails = {
        placementId: placementId,
        candidate: {
          candidateId: 5001,
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@email.com",
          phone: "+1 (555) 123-4567",
          mobile: "+1 (555) 123-4567",
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
            name: "Placed",
            active: true
          },
          rating: "4.8",
          source: "LinkedIn",
          skills: ["JavaScript", "React", "TypeScript", "Node.js"],
          employment: {
            current: [{
              employer: "Previous Company",
              position: "Senior Developer"
            }]
          }
        },
        job: {
          jobId: 1,
          jobTitle: "Senior Frontend Developer",
          location: {
            locationId: 201,
            name: "San Francisco, CA"
          },
          company: {
            companyId: 101,
            name: "Tech Corp"
          },
          contact: {
            contactId: 301,
            firstName: "John",
            lastName: "Manager",
            email: "john.manager@techcorp.com",
            position: "Engineering Manager"
          }
        },
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        },
        workType: {
          workTypeId: 1,
          name: "Full-time Permanent"
        },
        salary: {
          rate: 120000,
          currency: "USD",
          ratePer: "Year"
        },
        startDate: "2024-02-01T00:00:00Z",
        endDate: null,
        notes: "Great placement - candidate is performing well.",
        createdAt: "2024-01-20T10:30:00Z",
        updatedAt: "2024-01-25T15:45:00Z",
        owner: {
          userId: 100,
          firstName: "Recruiter",
          lastName: "Name",
          email: "recruiter@company.com"
        }
      };
      
      setPlacementDetails(mockPlacement);
      setError('Demo mode - Using sample placement data');
      return mockPlacement;
    } finally {
      setLoading(false);
    }
  };

  const updatePlacementStatus = async (
    placementId: number, 
    statusId: number, 
    notes?: string
  ): Promise<PlacementDetails> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'placements',
          method: 'PUT',
          placementId: placementId,
          statusId: statusId,
          notes: notes
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setPlacementDetails(data);
      return data;
    } catch (apiError) {
      console.error('Failed to update placement status:', apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  const clearPlacementDetails = () => {
    setPlacementDetails(null);
    setError(null);
  };

  return {
    placementDetails,
    loading,
    error,
    fetchPlacementDetails,
    updatePlacementStatus,
    clearPlacementDetails
  };
}