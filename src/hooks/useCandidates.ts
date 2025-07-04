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

// Mock data for fallback
const mockCandidates: JobAdderCandidate[] = [
  {
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
      name: "Active",
      active: true,
      default: true
    },
    rating: "4.8",
    source: "LinkedIn",
    seeking: "Yes",
    summary: "Experienced frontend developer with 8+ years in React and TypeScript",
    skills: ["React", "TypeScript", "JavaScript", "CSS", "Node.js"],
    experienceYears: 8,
    currentRole: "Senior Frontend Developer",
    currentCompany: "Previous Tech Co",
    availability: "2 weeks notice"
  },
  {
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
      statusId: 1,
      name: "Active",
      active: true,
      default: true
    },
    rating: "4.9",
    source: "Company Website",
    seeking: "Yes",
    summary: "Product management expert with experience scaling B2B products",
    skills: ["Product Strategy", "Analytics", "Scrum", "SQL", "Roadmapping"],
    experienceYears: 6,
    currentRole: "Product Manager",
    currentCompany: "Growth Startup",
    availability: "Immediate"
  },
  {
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
      name: "Active",
      active: true,
      default: true
    },
    rating: "4.7",
    source: "Dribbble",
    seeking: "Yes",
    summary: "Creative UX designer focused on user-centered design principles",
    skills: ["UX Design", "Figma", "User Research", "Prototyping", "Design Systems"],
    experienceYears: 5,
    currentRole: "UX Designer",
    currentCompany: "Design Agency",
    availability: "1 month notice"
  }
];

export function useCandidates() {
  const [candidates, setCandidates] = useState<JobAdderCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchCandidates = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from edge function
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

      setCandidates(data.items || data);
      setUseMockData(false);
    } catch (err) {
      console.warn('API unavailable, using mock data:', err);
      // Fallback to mock data
      let filteredCandidates = mockCandidates;
      if (searchTerm) {
        filteredCandidates = mockCandidates.filter(candidate => 
          `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.currentRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.currentCompany?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setCandidates(filteredCandidates);
      setUseMockData(true);
      setError('Using demo data - API unavailable');
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
    useMockData,
    refetch: fetchCandidates
  };
}