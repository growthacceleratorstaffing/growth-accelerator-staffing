import { useState, useEffect } from 'react';
import oauth2Manager from '@/lib/oauth2-manager';

// JobAdder Placement interfaces based on API docs
export interface JobAdderPlacement {
  placementId: number;
  status: {
    statusId: number;
    name: string;
    active: boolean;
    default: boolean;
  };
  candidate: {
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
  };
  job: {
    jobId: number;
    jobTitle: string;
    location?: {
      locationId: number;
      name: string;
      area?: {
        areaId: number;
        name: string;
      };
    };
    company?: {
      companyId: number;
      name: string;
      status?: {
        statusId: number;
        name: string;
        active: boolean;
        default: boolean;
      };
      owner?: {
        userId: number;
        firstName: string;
        lastName: string;
        email: string;
      };
    };
    contact?: {
      contactId: number;
      firstName: string;
      lastName: string;
      position?: string;
      email: string;
      phone?: string;
    };
    status?: {
      statusId: number;
      name: string;
      active: boolean;
      default: boolean;
    };
    source?: string;
    owner?: {
      userId: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  salary?: {
    ratePer: string;
    rate: number;
    currency: string;
    timePerWeek?: number;
  };
  startDate?: string;
  endDate?: string;
  workType?: {
    workTypeId: number;
    name: string;
    ratePer: string;
  };
  billingTerms?: {
    billingTermsId: number;
    name: string;
  };
  paymentType?: {
    paymentTypeId: number;
    name: string;
  };
  award?: {
    awardId: number;
    name: string;
  };
  owner?: {
    userId: number;
    firstName: string;
    lastName: string;
    position?: string;
    email: string;
    phone?: string;
    mobile?: string;
    inactive: boolean;
    deleted: boolean;
  };
  createdBy?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt?: string;
  updatedBy?: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedAt?: string;
  notes?: string;
  custom?: any[];
}

interface PlacementsResponse {
  items: JobAdderPlacement[];
  totalCount: number;
  links?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

class PlacementsAPI {
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

  async findPlacements(params?: {
    offset?: number;
    limit?: number;
  }): Promise<PlacementsResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.offset) searchParams.append('offset', params.offset.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const url = `https://api.jobadder.com/v2/placements${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
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
      console.error('Error fetching placements:', error);
      throw error;
    }
  }

  async getPlacement(placementId: number): Promise<JobAdderPlacement> {
    try {
      const url = `https://api.jobadder.com/v2/placements/${placementId}`;
      
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
      console.error('Error fetching placement details:', error);
      throw error;
    }
  }
}

// Mock data for fallback
const mockPlacements: JobAdderPlacement[] = [
  {
    placementId: 2001,
    status: {
      statusId: 1,
      name: "Active",
      active: true,
      default: true
    },
    candidate: {
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
        statusId: 3,
        name: "Placed",
        active: true,
        default: false
      },
      rating: "4.8",
      source: "LinkedIn",
      seeking: "No"
    },
    job: {
      jobId: 1,
      jobTitle: "Senior Frontend Developer",
      location: {
        locationId: 201,
        name: "San Francisco, CA",
        area: {
          areaId: 301,
          name: "Bay Area"
        }
      },
      company: {
        companyId: 101,
        name: "Tech Corp",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      },
      contact: {
        contactId: 1001,
        firstName: "John",
        lastName: "Smith",
        position: "Engineering Manager",
        email: "john.smith@techcorp.com",
        phone: "+1 (555) 234-5678"
      }
    },
    salary: {
      ratePer: "Year",
      rate: 145000,
      currency: "USD",
      timePerWeek: 40
    },
    startDate: "2024-02-01",
    endDate: "2025-02-01",
    workType: {
      workTypeId: 1,
      name: "Full-time Permanent",
      ratePer: "Year"
    },
    createdAt: "2024-01-25T14:30:00Z",
    updatedAt: "2024-01-25T14:30:00Z"
  },
  {
    placementId: 2002,
    status: {
      statusId: 1,
      name: "Active",
      active: true,
      default: true
    },
    candidate: {
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
        statusId: 3,
        name: "Placed",
        active: true,
        default: false
      },
      rating: "4.9",
      source: "Company Website",
      seeking: "No"
    },
    job: {
      jobId: 2,
      jobTitle: "Product Manager",
      location: {
        locationId: 202,
        name: "New York, NY",
        area: {
          areaId: 302,
          name: "New York Metro"
        }
      },
      company: {
        companyId: 102,
        name: "Innovation Inc",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      },
      contact: {
        contactId: 1002,
        firstName: "Sarah",
        lastName: "Johnson",
        position: "VP of Product",
        email: "sarah.j@innovation.com",
        phone: "+1 (555) 345-6789"
      }
    },
    salary: {
      ratePer: "Year",
      rate: 165000,
      currency: "USD",
      timePerWeek: 40
    },
    startDate: "2024-02-15",
    workType: {
      workTypeId: 1,
      name: "Full-time Permanent",
      ratePer: "Year"
    },
    createdAt: "2024-01-28T09:15:00Z",
    updatedAt: "2024-01-28T09:15:00Z"
  },
  {
    placementId: 2003,
    status: {
      statusId: 2,
      name: "Pending Start",
      active: true,
      default: false
    },
    candidate: {
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
        statusId: 3,
        name: "Placed",
        active: true,
        default: false
      },
      rating: "4.7",
      source: "Dribbble",
      seeking: "No"
    },
    job: {
      jobId: 3,
      jobTitle: "UX Designer",
      location: {
        locationId: 203,
        name: "Remote"
      },
      company: {
        companyId: 103,
        name: "Design Studio",
        status: {
          statusId: 1,
          name: "Active",
          active: true,
          default: true
        }
      },
      contact: {
        contactId: 1003,
        firstName: "Mike",
        lastName: "Chen",
        position: "Design Director",
        email: "mike.chen@designstudio.com",
        phone: "+1 (555) 567-8901"
      }
    },
    salary: {
      ratePer: "Year",
      rate: 95000,
      currency: "USD",
      timePerWeek: 40
    },
    startDate: "2024-03-01",
    workType: {
      workTypeId: 2,
      name: "Full-time Contract",
      ratePer: "Year"
    },
    createdAt: "2024-01-30T16:45:00Z",
    updatedAt: "2024-01-30T16:45:00Z"
  }
];

export const placementsAPI = new PlacementsAPI();

export function usePlacements() {
  const [placements, setPlacements] = useState<JobAdderPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchPlacements = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from JobAdder API
      const response = await placementsAPI.findPlacements({ 
        limit: 100 
      });
      
      let filteredPlacements = response.items;
      if (searchTerm) {
        filteredPlacements = response.items.filter(placement => 
          `${placement.candidate.firstName} ${placement.candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.job.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setPlacements(filteredPlacements);
      setUseMockData(false);
    } catch (err) {
      console.warn('JobAdder API unavailable, using mock data:', err);
      // Fallback to mock data
      let filteredPlacements = mockPlacements;
      if (searchTerm) {
        filteredPlacements = mockPlacements.filter(placement => 
          `${placement.candidate.firstName} ${placement.candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.job.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setPlacements(filteredPlacements);
      setUseMockData(true);
      setError('Using demo data - API unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacements();
  }, []);

  return {
    placements,
    loading,
    error,
    useMockData,
    refetch: fetchPlacements
  };
}