import { useState, useEffect } from 'react';
import { jobAdderAPI, type JobAdderJob } from '@/lib/jobadder-api';

// Mock data as fallback
const mockJobs: JobAdderJob[] = [
  {
    adId: 1,
    state: "Published",
    title: "Senior Frontend Developer",
    reference: "SFD-2024-001",
    summary: "Join our innovative team building cutting-edge web applications",
    bulletPoints: [
      "Work with React, TypeScript, and modern tools",
      "Collaborative team environment",
      "Growth opportunities"
    ],
    company: {
      companyId: 101,
      name: "Tech Corp"
    },
    location: {
      locationId: 201,
      name: "San Francisco, CA",
      area: {
        areaId: 301,
        name: "Bay Area"
      }
    },
    workType: {
      workTypeId: 1,
      name: "Full-time"
    },
    salary: {
      ratePer: "Year",
      rateLow: 120000,
      rateHigh: 160000,
      currency: "USD"
    },
    category: {
      categoryId: 1,
      name: "Technology",
      subCategory: {
        subCategoryId: 11,
        name: "Software Development"
      }
    },
    postAt: "2024-01-22T10:30:00Z",
    expireAt: "2024-03-22T23:59:59Z",
    owner: {
      userId: 1001,
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@techcorp.com"
    }
  },
  {
    adId: 2,
    state: "Published",
    title: "Product Manager",
    reference: "PM-2024-002",
    summary: "Lead product strategy for our core platform",
    bulletPoints: [
      "Drive product roadmap and strategy",
      "Work with cross-functional teams",
      "Data-driven decision making"
    ],
    company: {
      companyId: 102,
      name: "Innovation Inc"
    },
    location: {
      locationId: 202,
      name: "New York, NY",
      area: {
        areaId: 302,
        name: "New York Metro"
      }
    },
    workType: {
      workTypeId: 1,
      name: "Full-time"
    },
    salary: {
      ratePer: "Year",
      rateLow: 140000,
      rateHigh: 180000,
      currency: "USD"
    },
    category: {
      categoryId: 2,
      name: "Product Management"
    },
    postAt: "2024-01-15T14:20:00Z",
    expireAt: "2024-03-15T23:59:59Z",
    owner: {
      userId: 1002,
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@innovation.com"
    }
  },
  {
    adId: 3,
    state: "Published",
    title: "UX Designer",
    reference: "UXD-2024-003",
    summary: "Create beautiful and intuitive user experiences",
    bulletPoints: [
      "Design user-centered experiences",
      "Conduct user research",
      "Prototype and test designs"
    ],
    company: {
      companyId: 103,
      name: "Design Studio"
    },
    location: {
      locationId: 203,
      name: "Remote"
    },
    workType: {
      workTypeId: 2,
      name: "Contract"
    },
    salary: {
      ratePer: "Year",
      rateLow: 80000,
      rateHigh: 100000,
      currency: "USD"
    },
    category: {
      categoryId: 3,
      name: "Design",
      subCategory: {
        subCategoryId: 31,
        name: "User Experience"
      }
    },
    postAt: "2024-01-19T09:15:00Z",
    expireAt: "2024-03-19T23:59:59Z",
    owner: {
      userId: 1003,
      firstName: "Mike",
      lastName: "Chen",
      email: "mike.chen@designstudio.com"
    }
  }
];

export function useJobs() {
  const [jobs, setJobs] = useState<JobAdderJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const fetchJobs = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from API
      const response = await jobAdderAPI.findJobBoardJobAds({
        limit: 50,
        search: searchTerm
      });
      setJobs(response.items);
      setUseMockData(false);
    } catch (err) {
      console.warn('API unavailable, using mock data:', err);
      // Fallback to mock data
      let filteredJobs = mockJobs;
      if (searchTerm) {
        filteredJobs = mockJobs.filter(job => 
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.location.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setJobs(filteredJobs);
      setUseMockData(true);
      setError('Using demo data - API unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return {
    jobs,
    loading,
    error,
    useMockData,
    refetch: fetchJobs
  };
}