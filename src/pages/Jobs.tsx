import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Building, Clock, DollarSign, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface Job {
  jobId: number;
  jobTitle: string;
  company: {
    companyId: number;
    name: string;
    status: {
      statusId: number;
      name: string;
      active: boolean;
      default: boolean;
    };
  };
  location: {
    locationId: number;
    name: string;
    area?: {
      areaId: number;
      name: string;
    };
  };
  workType?: {
    workTypeId: number;
    name: string;
    ratePer: string;
  };
  salary?: {
    ratePer: string;
    rateLow: number;
    rateHigh: number;
    currency: string;
    timePerWeek?: number;
  };
  jobDescription: string;
  category?: {
    categoryId: number;
    name: string;
    subCategory?: {
      subCategoryId: number;
      name: string;
    };
  };
  status: {
    statusId: number;
    name: string;
    active: boolean;
    default: boolean;
  };
  source?: string;
  createdAt: string;
  statistics?: {
    applications: {
      new: number;
      active: number;
      total: number;
    };
  };
}

const sampleJobs: Job[] = [
  {
    jobId: 1,
    jobTitle: "Senior Frontend Developer",
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
      name: "Full-time",
      ratePer: "Hour"
    },
    salary: {
      ratePer: "Year",
      rateLow: 120000,
      rateHigh: 160000,
      currency: "USD",
      timePerWeek: 40
    },
    jobDescription: "We're looking for an experienced frontend developer to join our team and build cutting-edge web applications using React, TypeScript, and modern development practices.",
    category: {
      categoryId: 1,
      name: "Technology",
      subCategory: {
        subCategoryId: 11,
        name: "Software Development"
      }
    },
    status: {
      statusId: 1,
      name: "Open",
      active: true,
      default: true
    },
    source: "Company Website",
    createdAt: "2024-01-22T10:30:00Z",
    statistics: {
      applications: {
        new: 5,
        active: 18,
        total: 23
      }
    }
  },
  {
    jobId: 2,
    jobTitle: "Product Manager",
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
      name: "Full-time",
      ratePer: "Hour"
    },
    salary: {
      ratePer: "Year",
      rateLow: 140000,
      rateHigh: 180000,
      currency: "USD",
      timePerWeek: 40
    },
    jobDescription: "Lead product strategy and development for our core platform, working closely with engineering and design teams to deliver exceptional user experiences.",
    category: {
      categoryId: 2,
      name: "Product Management",
      subCategory: {
        subCategoryId: 21,
        name: "Product Strategy"
      }
    },
    status: {
      statusId: 1,
      name: "Open",
      active: true,
      default: true
    },
    source: "LinkedIn",
    createdAt: "2024-01-15T14:20:00Z",
    statistics: {
      applications: {
        new: 3,
        active: 12,
        total: 15
      }
    }
  },
  {
    jobId: 3,
    jobTitle: "UX Designer",
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
    location: {
      locationId: 203,
      name: "Remote"
    },
    workType: {
      workTypeId: 2,
      name: "Contract",
      ratePer: "Hour"
    },
    salary: {
      ratePer: "Year",
      rateLow: 80000,
      rateHigh: 100000,
      currency: "USD",
      timePerWeek: 40
    },
    jobDescription: "Create beautiful and intuitive user experiences for our digital products, conducting user research and creating wireframes, prototypes, and high-fidelity designs.",
    category: {
      categoryId: 3,
      name: "Design",
      subCategory: {
        subCategoryId: 31,
        name: "User Experience"
      }
    },
    status: {
      statusId: 1,
      name: "Open",
      active: true,
      default: true
    },
    source: "Dribbble",
    createdAt: "2024-01-19T09:15:00Z",
    statistics: {
      applications: {
        new: 2,
        active: 6,
        total: 8
      }
    }
  }
];

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredJobs, setFilteredJobs] = useState(sampleJobs);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = sampleJobs.filter(job => 
      job.jobTitle.toLowerCase().includes(value.toLowerCase()) ||
      job.company.name.toLowerCase().includes(value.toLowerCase()) ||
      job.location.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredJobs(filtered);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Job Listings</h1>
          <p className="text-muted-foreground mt-2">Find your next opportunity</p>
        </div>
        <Link to="/post-job">
          <Button>Post a Job</Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies, or locations..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {filteredJobs.map((job) => (
          <Card key={job.jobId} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl mb-2">{job.jobTitle}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-base">
                    <span className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {job.company.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location.name}
                    </span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{job.workType?.name || 'Full-time'}</Badge>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{job.jobDescription}</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {job.salary ? `$${job.salary.rateLow?.toLocaleString()} - $${job.salary.rateHigh?.toLocaleString()}` : 'Competitive'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {job.statistics?.applications.total || 0} applications
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">View Details</Button>
                  <Button>Apply Now</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Jobs;