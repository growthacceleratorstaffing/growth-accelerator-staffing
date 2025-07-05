import { JobList } from "@/components/job-search/JobList";
import { SearchStats } from "@/components/job-search/SearchStats";
import { CrawlJobsButton } from "@/components/job-search/CrawlJobsButton";
import { useJobSearch } from "@/hooks/useJobSearch";

const CareerPage = () => {
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
            <h1 className="text-4xl font-bold tracking-tight text-secondary">
              Career Opportunities
            </h1>
            <p className="text-xl text-white">
              Discover your next career move with top companies
            </p>
          </div>
        </div>
        
        <div className="flex justify-center mt-6">
          <CrawlJobsButton onCrawl={crawlJobs} />
        </div>
        
        <div className="mt-8">
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

export default CareerPage;