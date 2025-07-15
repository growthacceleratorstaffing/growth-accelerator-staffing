import { JobList } from "@/components/job-search/JobList";
import { SearchStats } from "@/components/job-search/SearchStats";
import { CrawlJobsButton } from "@/components/job-search/CrawlJobsButton";
import { useJobSearch } from "@/hooks/useJobSearch";

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

const JobBoard = () => {
  const {
    jobs,
    isLoading,
    searchQuery,
    filters,
    setFilters,
    crawlJobs,
    totalResults,
  } = useJobSearch();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-pink-500">
              Career Page
            </h1>
            <p className="text-xl text-white">
              Discover exciting career opportunities
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex justify-center">
            <CrawlJobsButton onCrawl={crawlJobs} />
          </div>
          
          <SearchStats 
            query={searchQuery}
            totalResults={totalResults}
            isLoading={isLoading}
          />
          
          <JobList 
            jobs={jobs}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default JobBoard;