import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Calendar, Building, Search, Briefcase, RefreshCw } from "lucide-react";

// ============= TYPES =============
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  type: "full-time" | "part-time" | "contract" | "remote";
  postedDate: string;
  url: string;
  source: string;
}

// ============= MOCK DATA =============
const mockJobs: JobListing[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "Amsterdam, Netherlands",
    salary: "€60,000 - €80,000",
    description: "We're looking for a passionate Frontend Developer to join our dynamic team. You'll work on cutting-edge projects using React, TypeScript, and modern web technologies.",
    type: "full-time",
    postedDate: "2024-01-15",
    url: "https://example.com/job/1",
    source: "Company Website"
  },
  {
    id: "2",
    title: "Product Manager",
    company: "InnovateCo",
    location: "Rotterdam, Netherlands",
    salary: "€70,000 - €90,000",
    description: "Lead product strategy and development for our flagship SaaS platform. Work closely with engineering and design teams to deliver exceptional user experiences.",
    type: "full-time",
    postedDate: "2024-01-14",
    url: "https://example.com/job/2",
    source: "Company Website"
  },
  {
    id: "3",
    title: "UX/UI Designer",
    company: "DesignStudio",
    location: "Remote",
    salary: "€50,000 - €65,000",
    description: "Create beautiful and intuitive user interfaces for web and mobile applications. Collaborate with product teams to design user-centered solutions.",
    type: "remote",
    postedDate: "2024-01-13",
    url: "https://example.com/job/3",
    source: "Company Website"
  },
  {
    id: "4",
    title: "Data Scientist",
    company: "DataCorp",
    location: "Utrecht, Netherlands",
    salary: "€65,000 - €85,000",
    description: "Apply machine learning and statistical analysis to solve complex business problems. Work with large datasets and develop predictive models.",
    type: "full-time",
    postedDate: "2024-01-12",
    url: "https://example.com/job/4",
    source: "Company Website"
  },
  {
    id: "5",
    title: "Marketing Specialist",
    company: "GrowthCo",
    location: "The Hague, Netherlands",
    salary: "€45,000 - €55,000",
    description: "Drive digital marketing campaigns and grow our online presence. Experience with SEO, social media, and content marketing required.",
    type: "part-time",
    postedDate: "2024-01-11",
    url: "https://example.com/job/5",
    source: "Company Website"
  },
  {
    id: "6",
    title: "DevOps Engineer",
    company: "CloudTech",
    location: "Eindhoven, Netherlands",
    salary: "€70,000 - €90,000",
    description: "Build and maintain our cloud infrastructure. Experience with AWS, Docker, and Kubernetes required. Help scale our platform to millions of users.",
    type: "full-time",
    postedDate: "2024-01-10",
    url: "https://example.com/job/6",
    source: "Company Website"
  }
];

// ============= COMPONENTS =============

// Search Stats Component
interface SearchStatsProps {
  query: string;
  totalResults: number;
  isLoading: boolean;
}

const SearchStats = ({ query, totalResults, isLoading }: SearchStatsProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {query ? `Search results for "${query}"` : "All available positions"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {isLoading ? "Loading..." : `${totalResults} jobs found`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Job Application Modal Component (simplified)
interface JobApplicationModalProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
}

const JobApplicationModal = ({ job, isOpen, onClose }: JobApplicationModalProps) => {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Apply for {job.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This is a demo application form. In a real implementation, you would integrate with your application system.
        </p>
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close
          </Button>
          <Button asChild className="flex-1">
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              Apply on Website
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Job List Component
interface JobListProps {
  jobs: JobListing[];
  isLoading: boolean;
  onApply: (job: JobListing) => void;
}

const JobList = ({ jobs, isLoading, onApply }: JobListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-4/5"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No jobs found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Building className="h-4 w-4" />
                  {job.company}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="ml-2">
                {job.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {job.location}
              </div>
              {job.salary && (
                <div className="text-sm font-medium text-primary">
                  {job.salary}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(job.postedDate).toLocaleDateString()}
              </div>
            </div>
            
            {job.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {job.description}
              </p>
            )}
            
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="text-xs">
                {job.source}
              </Badge>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onApply(job)}>
                  Apply Now
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    View Job
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ============= MAIN COMPONENT =============
const ExportableCareerPage = () => {
  const [jobs] = useState<JobListing[]>(mockJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApply = (job: JobListing) => {
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleCloseModal = () => {
    setShowApplicationModal(false);
    setSelectedJob(null);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-primary">
              Join Our Team
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover exciting career opportunities and grow with us
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mb-6">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isLoading ? "Refreshing..." : "Refresh Jobs"}
          </Button>
        </div>
        
        {/* Search Stats */}
        <SearchStats 
          query={searchQuery}
          totalResults={filteredJobs.length}
          isLoading={isLoading}
        />
        
        {/* Job List */}
        <JobList 
          jobs={filteredJobs}
          isLoading={isLoading}
          onApply={handleApply}
        />

        {/* Application Modal */}
        <JobApplicationModal
          job={selectedJob}
          isOpen={showApplicationModal}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
};

export default ExportableCareerPage;