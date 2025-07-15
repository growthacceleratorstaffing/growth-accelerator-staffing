import { useState, useEffect } from 'react';
import { JazzHRAPIClient, type JazzHRJob } from '@/lib/jazzhr-api';

// Mock job detail data as fallback
const mockJobDetails: Record<string, JazzHRJob> = {
  "1": {
    id: "1",
    title: "Senior Frontend Developer",
    status: "Published",
    description: "We're looking for an experienced frontend developer to join our team and build cutting-edge web applications using React, TypeScript, and modern development practices.",
    department: "Engineering",
    hiring_lead: "John Smith",
    location: {
      city: "San Francisco",
      state: "CA"
    },
    minimum_salary: 120000,
    maximum_salary: 160000,
    original_open_date: "2024-01-22T10:30:00Z",
    type: "Full-time",
    send_to_job_boards: true,
    board_code: "SFD-2024-001"
  },
  "2": {
    id: "2",
    title: "Product Manager",
    status: "Published", 
    description: "Lead product strategy and development for our core platform, working closely with engineering and design teams to deliver exceptional user experiences.",
    department: "Product",
    hiring_lead: "Sarah Johnson",
    location: {
      city: "New York",
      state: "NY"
    },
    minimum_salary: 140000,
    maximum_salary: 180000,
    original_open_date: "2024-01-15T14:20:00Z",
    type: "Full-time",
    send_to_job_boards: true,
    board_code: "PM-2024-002"
  },
  "3": {
    id: "3",
    title: "UX Designer",
    status: "Published",
    description: "Create beautiful and intuitive user experiences for our digital products, conducting user research and creating wireframes, prototypes, and high-fidelity designs.",
    department: "Design",
    hiring_lead: "Mike Chen", 
    location: {
      city: "Remote",
      state: ""
    },
    minimum_salary: 80000,
    maximum_salary: 100000,
    original_open_date: "2024-01-19T09:15:00Z",
    type: "Contract",
    send_to_job_boards: true,
    board_code: "UXD-2024-003"
  }
};

export function useJobDetail(jobId: string) {
  const [jobDetail, setJobDetail] = useState<JazzHRJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!jobId) return;
      
      setLoading(true);
      setError(null);

      try {
        // Try to fetch from JazzHR API
        const jazzHRClient = new JazzHRAPIClient();
        const detail = await jazzHRClient.getJob(jobId);
        setJobDetail(detail);
        setUseMockData(false);
      } catch (err) {
        console.warn('JazzHR API unavailable, using mock data:', err);
        // Fallback to mock data
        const mockDetail = mockJobDetails[jobId];
        if (mockDetail) {
          setJobDetail(mockDetail);
          setUseMockData(true);
          setError('Using demo data - JazzHR API unavailable');
        } else {
          setError('Job not found');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetail();
  }, [jobId]);

  return {
    jobDetail,
    loading,
    error,
    useMockData
  };
}