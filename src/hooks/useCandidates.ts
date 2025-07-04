import { useState, useEffect } from 'react';
import oauth2Manager from '@/lib/oauth2-manager';

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

interface CandidatesResponse {
  items: JobAdderCandidate[];
  totalCount: number;
  links?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

class CandidatesAPI {
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
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
        
        console.warn(`Rate limited (429). Waiting ${waitTime / 1000} seconds before retry...`);
        
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

  async findCandidates(params?: {
    offset?: number;
    limit?: number;
    search?: string;
  }): Promise<CandidatesResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.offset) searchParams.append('offset', params.offset.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.search) searchParams.append('search', params.search);

      const url = `https://api.jobadder.com/v2/candidates${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const headers = await this.getHeaders();
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  }

  async getCandidate(candidateId: number): Promise<JobAdderCandidate> {
    try {
      const url = `https://api.jobadder.com/v2/candidates/${candidateId}`;
      
      const headers = await this.getHeaders();
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      throw error;
    }
  }
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

export const candidatesAPI = new CandidatesAPI();

export function useCandidates() {
  const [candidates, setCandidates] = useState<JobAdderCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchCandidates = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from API
      const response = await candidatesAPI.findCandidates({
        limit: 100,
        search: searchTerm
      });
      setCandidates(response.items);
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