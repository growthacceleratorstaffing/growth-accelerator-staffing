import { JobList } from "@/components/job-search/JobList";
import { SearchStats } from "@/components/job-search/SearchStats";
import { CrawlJobsButton } from "@/components/job-search/CrawlJobsButton";
import { JobAdderJobList } from "@/components/job-search/JobAdderJobList";
import { JobAdderSearchBar } from "@/components/job-search/JobAdderSearchBar";
import { JobAdderSearchStats } from "@/components/job-search/JobAdderSearchStats";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useJobs } from "@/hooks/useJobs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

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

  const [jobAdderParams, setJobAdderParams] = useState({ search: "", limit: 20, offset: 0 });
  const { 
    jobs: jobAdderJobs = [], 
    loading: jobAdderLoading, 
    error: jobAdderError,
    useMockData,
    refetch: refetchJobAdder 
  } = useJobs();

  const handleJobAdderSearch = (params: { search?: string; limit?: number; offset?: number }) => {
    const searchTerm = params.search || "";
    setJobAdderParams({ 
      search: searchTerm, 
      limit: params.limit || 20, 
      offset: params.offset || 0 
    });
    refetchJobAdder(searchTerm);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-pink-500">
              Job Board
            </h1>
            <p className="text-xl text-white">
              Discover your next career move with top companies
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="crawled" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crawled">Career Page</TabsTrigger>
            <TabsTrigger value="jobadder">Jobs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="crawled" className="space-y-6">
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
          </TabsContent>
          
          <TabsContent value="jobadder" className="space-y-6">
            <JobAdderSearchBar 
              onSearch={handleJobAdderSearch}
              isLoading={jobAdderLoading}
            />
            
            <JobAdderSearchStats 
              searchQuery={jobAdderParams.search}
              totalResults={jobAdderJobs.length}
              isLoading={jobAdderLoading}
            />
            
            <JobAdderJobList 
              jobs={jobAdderJobs}
              isLoading={jobAdderLoading}
            />
            
            {useMockData && (
              <div className="text-center p-4 bg-muted/50 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  📝 Demo Mode: Showing sample data as JobAdder API is not available
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default JobBoard;