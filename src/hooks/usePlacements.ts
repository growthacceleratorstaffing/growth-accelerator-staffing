import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

// Placement interfaces based on API specification
export interface JazzHRPlacement {
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
  items: JazzHRPlacement[];
  totalCount: number;
  links?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

// Mock data for fallback
const mockPlacements: JazzHRPlacement[] = [
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

export function usePlacements() {
  const [placements, setPlacements] = useState<JazzHRPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchPlacements = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      let jazzHRPlacements: JazzHRPlacement[] = [];
      let useJazzHRMock = false;

      // Try to fetch from JazzHR API first
      try {
        const { data, error: supabaseError } = await supabase.functions.invoke('jazzhr-api', {
          body: { 
            endpoint: 'placements',
            limit: 100
          }
        });

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        jazzHRPlacements = data.items || data || [];
      } catch (apiError) {
        console.warn('JazzHR API unavailable, using mock data for JazzHR placements:', apiError);
        jazzHRPlacements = mockPlacements;
        useJazzHRMock = true;
      }

      // Always fetch local placements - this is the key part
      let localPlacements: JazzHRPlacement[] = [];
      try {
        console.log('Fetching local placements from database...');
        const { data: localData, error: localError } = await supabase
          .from('local_placements')
          .select('*')
          .order('created_at', { ascending: false });

        if (localError) {
          console.error('Error fetching local placements:', localError);
        } else {
          console.log(`Successfully fetched ${localData?.length || 0} local placements:`, localData);
          // Convert local placements to JazzHRPlacement format
          localPlacements = (localData || []).map((local, index) => ({
            placementId: -2000 - index, // Unique negative IDs for local placements
            status: {
              statusId: local.status_id || 1,
              name: local.status_name || 'Active',
              active: true,
              default: local.status_id === 1
            },
            candidate: {
              candidateId: parseInt(local.candidate_id) || -1,
              firstName: local.candidate_name?.split(' ')[0] || 'Unknown',
              lastName: local.candidate_name?.split(' ').slice(1).join(' ') || '',
              email: local.candidate_email || 'unknown@email.com',
              status: {
                statusId: 3,
                name: 'Placed',
                active: true,
                default: false
              }
            },
            job: {
              jobId: parseInt(local.job_id) || -1,
              jobTitle: local.job_title || 'Unknown Job',
              company: {
                companyId: -1,
                name: local.company_name || 'Unknown Company',
                status: {
                  statusId: 1,
                  name: 'Active',
                  active: true,
                  default: true
                }
              }
            },
            salary: local.salary_rate ? {
              ratePer: local.salary_rate_per || 'Year',
              rate: parseFloat(local.salary_rate.toString()),
              currency: local.salary_currency || 'USD'
            } : undefined,
            startDate: local.start_date,
            endDate: local.end_date || undefined,
            notes: local.notes || undefined,
            createdAt: local.created_at,
            updatedAt: local.updated_at
          }));
          console.log('Converted local placements:', localPlacements);
        }
      } catch (localFetchError) {
        console.error('Error fetching local placements:', localFetchError);
      }

      // Combine JazzHR and local placements - prioritize local placements
      let allPlacements = [...localPlacements, ...jazzHRPlacements];
      console.log(`Total placements: ${allPlacements.length} (${localPlacements.length} local + ${jazzHRPlacements.length} JazzHR)`);

      // Apply search filter
      if (searchTerm) {
        allPlacements = allPlacements.filter(placement => 
          `${placement.candidate.firstName} ${placement.candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.job.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          placement.candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setPlacements(allPlacements);
      setUseMockData(useJazzHRMock && localPlacements.length === 0);
      setError(useJazzHRMock && localPlacements.length === 0 ? 'Using demo data for JazzHR - API unavailable' : null);
    } catch (err) {
      console.error('Error fetching placements:', err);
      setError('Error loading placements data');
      setPlacements([]);
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