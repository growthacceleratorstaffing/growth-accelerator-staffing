
import { useState, useCallback } from "react";
import { useJazzHRApplicants } from "@/hooks/useJazzHRApplicants";
import { useCandidateImport } from "@/hooks/useCandidateImport";
import { usePagination } from "@/hooks/usePagination";
import CandidatesHeader from "@/components/candidates/CandidatesHeader";
import CandidatesFilters from "@/components/candidates/CandidatesFilters";
import CandidatesPagination from "@/components/candidates/CandidatesPagination";
import JazzHRCandidatesList from "@/components/candidates/JazzHRCandidatesList";
import { JazzHRApplicant } from "@/lib/jazzhr-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Users, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const CANDIDATES_PER_PAGE = 50;

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const searchFilters = {
    name: searchTerm || undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    job_id: selectedJob !== "all" ? selectedJob : undefined,
  };

  const { 
    data: jazzhrCandidates = [], 
    isLoading: isJazzHRLoading, 
    error: jazzhrError,
    refetch: refetchJazzHR 
  } = useJazzHRApplicants(searchFilters);

  const { importCandidate, importingCandidates } = useCandidateImport();

  const {
    paginatedItems: paginatedCandidates,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = usePagination(jazzhrCandidates, CANDIDATES_PER_PAGE, currentPage);

  const handleImportCandidate = useCallback(async (candidate: JazzHRApplicant) => {
    try {
      await importCandidate({
        name: `${candidate.first_name} ${candidate.last_name}`,
        email: candidate.email,
        phone: candidate.phone || '',
        location: [candidate.city, candidate.state].filter(Boolean).join(', '),
        source_platform: 'JazzHR',
        jazzhr_candidate_id: candidate.id
      });
    } catch (error) {
      console.error('Failed to import candidate:', error);
    }
  }, [importCandidate]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  const handleJobChange = (value: string) => {
    setSelectedJob(value);
    setCurrentPage(1);
  };

  const handleGoToCandidates = () => {
    window.open('https://mijn.cootje.com/recruiter/kandidaten', '_blank');
  };

  const isLoading = isJazzHRLoading;
  const error = jazzhrError;
  const totalCandidates = jazzhrCandidates.length;
  
  const handleRefresh = () => {
    refetchJazzHR();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <CandidatesHeader candidateCount={totalCandidates} isLoading={isLoading} onRefresh={handleRefresh} />
          <Button onClick={handleGoToCandidates} className="flex items-center gap-2">
            Go to candidates
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load candidates from JazzHR: {error.message}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={handleRefresh} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <CandidatesHeader candidateCount={totalCandidates} isLoading={isLoading} onRefresh={handleRefresh} />
        <Button onClick={handleGoToCandidates} className="flex items-center gap-2">
          Go to candidates
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      <CandidatesFilters
        searchTerm={searchTerm}
        selectedStatus={selectedStatus}
        selectedSource={selectedJob}
        uniqueStatuses={[]} // Will be populated when we implement proper filtering
        uniqueSources={[]} // Will be populated when we implement proper filtering
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onSourceChange={handleJobChange}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-3/4 mb-4" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
        ) : jazzhrCandidates.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No JazzHR candidates found</h3>
            <p className="text-muted-foreground">No candidates found in your JazzHR account.</p>
            <Button onClick={handleRefresh} variant="outline" className="mt-4">
              Refresh Candidates
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
              <span>
                Showing {(currentPage - 1) * CANDIDATES_PER_PAGE + 1}-
                {Math.min(currentPage * CANDIDATES_PER_PAGE, jazzhrCandidates.length)} of {jazzhrCandidates.length} candidates
                (Page {currentPage} of {totalPages})
              </span>
            </div>
            <JazzHRCandidatesList 
              candidates={paginatedCandidates} 
              onImportCandidate={handleImportCandidate}
              importingCandidates={importingCandidates}
            />
            {totalPages > 1 && (
              <CandidatesPagination
                currentPage={currentPage}
                totalPages={totalPages}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                handlePageChange={handlePageChange}
              />
            )}
          </>
        )}
    </div>
  );
};

export default function CandidatesPageWithBoundary() {
  return (
    <div>
      <Candidates />
    </div>
  );
}
