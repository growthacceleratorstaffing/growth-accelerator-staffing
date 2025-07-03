import { useState, useEffect } from 'react';
import { jobAdderAPI, type JobAdderJobDetail } from '@/lib/jobadder-api';

// Mock job detail data as fallback
const mockJobDetails: Record<number, JobAdderJobDetail> = {
  1: {
    adId: 1,
    state: "Published",
    title: "Senior Frontend Developer",
    reference: "SFD-2024-001",
    summary: "Join our innovative team building cutting-edge web applications",
    description: "We're looking for an experienced frontend developer to join our team and build cutting-edge web applications using React, TypeScript, and modern development practices. You'll work closely with our design and backend teams to create exceptional user experiences.",
    requirements: "5+ years of experience with React and TypeScript, experience with modern build tools, strong CSS skills, experience with testing frameworks",
    benefits: "Competitive salary, health insurance, 401k matching, flexible work arrangements, professional development budget",
    bulletPoints: [
      "Work with React, TypeScript, and modern tools",
      "Collaborative team environment", 
      "Growth opportunities"
    ],
    skillTags: ["React", "TypeScript", "JavaScript", "CSS", "HTML"],
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
    },
    applications: {
      total: 23,
      new: 5,
      active: 18
    }
  },
  2: {
    adId: 2,
    state: "Published",
    title: "Product Manager",
    reference: "PM-2024-002",
    summary: "Lead product strategy for our core platform",
    description: "Lead product strategy and development for our core platform, working closely with engineering and design teams to deliver exceptional user experiences. Drive the product roadmap and make data-driven decisions.",
    requirements: "7+ years of product management experience, experience with agile methodologies, strong analytical skills, excellent communication skills",
    benefits: "Competitive salary, equity package, comprehensive health benefits, flexible PTO, remote work options",
    bulletPoints: [
      "Drive product roadmap and strategy",
      "Work with cross-functional teams",
      "Data-driven decision making"
    ],
    skillTags: ["Product Strategy", "Agile", "Analytics", "Leadership"],
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
    },
    applications: {
      total: 15,
      new: 3,
      active: 12
    }
  },
  3: {
    adId: 3,
    state: "Published",
    title: "UX Designer",
    reference: "UXD-2024-003",
    summary: "Create beautiful and intuitive user experiences",
    description: "Create beautiful and intuitive user experiences for our digital products, conducting user research and creating wireframes, prototypes, and high-fidelity designs. Work with product and engineering teams to bring designs to life.",
    requirements: "4+ years of UX design experience, proficiency in Figma or Sketch, experience with user research, strong portfolio",
    benefits: "Competitive salary, design conference budget, creative workspace, flexible hours, health benefits",
    bulletPoints: [
      "Design user-centered experiences",
      "Conduct user research",
      "Prototype and test designs"
    ],
    skillTags: ["Figma", "User Research", "Prototyping", "Design Systems"],
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
    },
    applications: {
      total: 8,
      new: 2,
      active: 6
    }
  }
};

export function useJobDetail(adId: number) {
  const [jobDetail, setJobDetail] = useState<JobAdderJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!adId) return;
      
      setLoading(true);
      setError(null);

      try {
        // Try to fetch from API
        const detail = await jobAdderAPI.getJobBoardJobAd(adId);
        setJobDetail(detail);
        setUseMockData(false);
      } catch (err) {
        console.warn('API unavailable, using mock data:', err);
        // Fallback to mock data
        const mockDetail = mockJobDetails[adId];
        if (mockDetail) {
          setJobDetail(mockDetail);
          setUseMockData(true);
          setError('Using demo data - API unavailable');
        } else {
          setError('Job not found');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetail();
  }, [adId]);

  return {
    jobDetail,
    loading,
    error,
    useMockData
  };
}