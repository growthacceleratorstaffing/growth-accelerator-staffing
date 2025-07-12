import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Calendar, Building, Search, Briefcase, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// import { useToast } from "@/hooks/use-toast"; // Commented out - using custom implementation below

// ============= SUPABASE SETUP =============
// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://doulsumepjfihqowzheq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWxzdW1lcGpmaWhxb3d6aGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Nzk3ODgsImV4cCI6MjA2NDQ1NTc4OH0.IewqiemFwcu74Y8Gla-XJUMiQp-ym8J-i0niylIVK2A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export interface SearchFilters {
  location: string;
  jobType: string;
  salaryMin: string;
  remote: boolean;
  datePosted: string;
}

interface CrawledJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  job_type: string | null;
  posted_date: string | null;
  url: string;
  source: string;
  crawled_at: string;
}

// ============= HOOKS =============
const useJobSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    jobType: "",
    salaryMin: "",
    remote: false,
    datePosted: "",
  });

  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs', searchQuery, filters],
    queryFn: async (): Promise<JobListing[]> => {
      let query = supabase
        .from('crawled_jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_date', { ascending: false });

      // Apply search query filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply location filter
      if (filters.location.trim()) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Apply job type filter
      if (filters.jobType && filters.jobType !== '') {
        query = query.eq('job_type', filters.jobType);
      }

      // Apply remote filter
      if (filters.remote) {
        query = query.or('job_type.eq.remote,location.ilike.%remote%');
      }

      // Apply date filter
      if (filters.datePosted) {
        const daysAgo = parseInt(filters.datePosted);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        query = query.gte('posted_date', cutoffDate.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }

      // Transform crawled jobs to JobListing format
      const transformedJobs = (data as CrawledJob[]).map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location || 'Unknown',
        salary: job.salary,
        description: job.description || '',
        type: (job.job_type as JobListing['type']) || 'full-time',
        postedDate: job.posted_date || job.crawled_at,
        url: job.url,
        source: job.source,
      }));

      // Filter out unwanted job listings by title
      const unwantedTitles = [
        'bart@growthaccelerator.nl',
        'midden-nederland',
        'zuid-holland',
        'zuid-nederland',
        'noord-holland',
        'oost-nederland',
        'vacatures',
        'data & ai vacatures',
        'data ai vacature overzicht',
        'github platform engineer'
      ];

      const filteredJobs = transformedJobs.filter(job => {
        const titleLower = job.title.toLowerCase().trim();
        
        // Check if the title contains any of the unwanted terms
        return !unwantedTitles.some(unwantedTitle => 
          titleLower.includes(unwantedTitle.toLowerCase())
        );
      });

      return filteredJobs;
    },
    enabled: true,
  });

  const crawlJobs = async () => {
    try {
      console.log('Starting job crawl...');
      const { data, error } = await supabase.functions.invoke('crawl-jobs');
      
      if (error) {
        console.error('Error crawling jobs:', error);
        throw error;
      }
      
      console.log('Crawl completed:', data);
      
      // Refetch the jobs after crawling
      await refetch();
      
      return data;
    } catch (error) {
      console.error('Failed to crawl jobs:', error);
      throw error;
    }
  };

  return {
    jobs,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    crawlJobs,
    totalResults: jobs.length,
  };
};

// Custom hook for toast notifications (simplified)
const useToast = () => {
  return {
    toast: (options: { title: string; description: string; variant?: "destructive" }) => {
      // Simple alert for demo - replace with your toast implementation
      alert(`${options.title}: ${options.description}`);
    }
  };
};

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

// Job Application Form Component
interface JobApplicationFormProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
}

const JobApplicationForm = ({ job, isOpen, onClose }: JobApplicationFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "NL"
    },
    currentEmployer: "",
    currentPosition: "",
    experience: "",
    education: "",
    availableDate: "",
    coverLetter: ""
  });

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [section, subField] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev] as any,
          [subField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!job) return;

    setLoading(true);

    try {
      // Store application in database
      const { error } = await supabase
        .from('candidate_responses')
        .insert({
          candidate_id: crypto.randomUUID(), // Generate temp ID for non-registered users
          job_id: job.id,
          message: formData.coverLetter,
          response_type: 'application',
          source: 'career_portal',
          status: 'new'
        });

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: `Your application for ${job.title} has been submitted successfully!`,
      });
      
      onClose();
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          countryCode: "NL"
        },
        currentEmployer: "",
        currentPosition: "",
        experience: "",
        education: "",
        availableDate: "",
        coverLetter: ""
      });
    } catch (error) {
      console.error('Application error:', error);
      toast({
        title: "Application Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {job.title}</DialogTitle>
          <DialogDescription>
            {job.company} • {job.location}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cover Letter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.coverLetter}
                onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                placeholder="Tell us why you're interested in this position..."
                rows={6}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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

// Crawl Jobs Button Component
interface CrawlJobsButtonProps {
  onCrawl: () => Promise<any>;
}

const CrawlJobsButton = ({ onCrawl }: CrawlJobsButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCrawl = async () => {
    setIsLoading(true);
    try {
      await onCrawl();
      toast({
        title: "Success",
        description: "Jobs crawled successfully! The list will update shortly.",
      });
    } catch (error) {
      console.error("Crawl error:", error);
      toast({
        title: "Error",
        description: "Failed to crawl jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCrawl}
      disabled={isLoading}
      className="bg-secondary hover:bg-secondary/90"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {isLoading ? "Crawling Jobs..." : "Refresh Jobs"}
    </Button>
  );
};

// ============= MAIN COMPONENT =============
const ExportableCareerPageWithRealData = () => {
  const {
    jobs,
    isLoading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    crawlJobs,
    totalResults,
  } = useJobSearch();

  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const handleApplyClick = (job: JobListing) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  const handleCloseForm = () => {
    setShowApplicationForm(false);
    setSelectedJob(null);
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
              Discover exciting career opportunities with top companies
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

        {/* Filters */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter location"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="jobType">Job Type</Label>
              <select
                id="jobType"
                value={filters.jobType}
                onChange={(e) => setFilters(prev => ({ ...prev, jobType: e.target.value }))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value="">All Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <Label htmlFor="datePosted">Date Posted</Label>
              <select
                id="datePosted"
                value={filters.datePosted}
                onChange={(e) => setFilters(prev => ({ ...prev, datePosted: e.target.value }))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value="">Any Time</option>
                <option value="1">Past 24 hours</option>
                <option value="7">Past week</option>
                <option value="30">Past month</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.remote}
                  onChange={(e) => setFilters(prev => ({ ...prev, remote: e.target.checked }))}
                />
                <span>Remote only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mb-6">
          <CrawlJobsButton onCrawl={crawlJobs} />
        </div>
        
        {/* Search Stats */}
        <SearchStats 
          query={searchQuery}
          totalResults={totalResults}
          isLoading={isLoading}
        />
        
        {/* Job List */}
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onApply={handleApplyClick}
        />

        {/* Application Form */}
        <JobApplicationForm
          job={selectedJob}
          isOpen={showApplicationForm}
          onClose={handleCloseForm}
        />
      </div>
    </div>
  );
};

export default ExportableCareerPageWithRealData;