import { JobAdderJobList } from "@/components/job-search/JobAdderJobList";
import { JobAdderSearchStats } from "@/components/job-search/JobAdderSearchStats";
import { JobAdderSearchBar } from "@/components/job-search/JobAdderSearchBar";
import { useJobs } from "@/hooks/useJobs";
import { useState } from "react";

const CareerPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { jobs, loading, error, useMockData, refetch } = useJobs();

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    refetch(term);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-secondary">
              Career Opportunities
            </h1>
            <p className="text-xl text-white">
              Discover your next career move with top companies via JobAdder
            </p>
            {useMockData && (
              <p className="text-sm text-yellow-400">
                ⚠️ Showing demo data - JobAdder API unavailable
              </p>
            )}
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto mb-8">
          <JobAdderSearchBar onSearch={handleSearch} />
        </div>
        
        <div className="mt-8">
          <JobAdderSearchStats 
            query={searchTerm}
            totalResults={jobs.length}
            isLoading={loading}
            error={error}
          />
          
          <JobAdderJobList 
            jobs={jobs}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default CareerPage;