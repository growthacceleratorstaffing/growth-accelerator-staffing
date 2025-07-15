import { useState, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { useJobApplications } from "@/hooks/useJobApplications";
import { useJobAdderCandidates } from "@/hooks/useJobAdderCandidates";
import { useCandidateImport } from "@/hooks/useCandidateImport";
import { usePagination } from "@/hooks/usePagination";
import CandidatesHeader from "@/components/candidates/CandidatesHeader";
import CandidatesFilters from "@/components/candidates/CandidatesFilters";
import CandidatesPagination from "@/components/candidates/CandidatesPagination";
import JobAdderCandidatesList from "@/components/candidates/JobAdderCandidatesList";

// Keep existing components for job applications (for now)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Mail, Phone, Search, Star, Download, Building, Calendar, User } from "lucide-react";

const CANDIDATES_PER_PAGE = 20;

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [jobAdderSearchTerm, setJobAdderSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [jobAdderCurrentPage, setJobAdderCurrentPage] = useState(1);

  const { applications, loading, error, useMockData, refetch } = useJobApplications();
  const { data: jobAdderCandidates = [], isLoading: jobAdderLoading, error: jobAdderError, refetch: refetchJobAdder } = useJobAdderCandidates(jobAdderSearchTerm);
  const { importCandidate, importingCandidates } = useCandidateImport();

  // Filter job applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = !searchTerm || 
        `${app.candidate.firstName} ${app.candidate.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.job.company?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === "all" || app.status.name === selectedStatus;
      const matchesSource = selectedSource === "all" || app.source === selectedSource;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [applications, searchTerm, selectedStatus, selectedSource]);

  // Filter JobAdder candidates
  const filteredJobAdderCandidates = useMemo(() => {
    return jobAdderCandidates.filter(candidate => {
      if (!jobAdderSearchTerm) return true;
      
      const searchLower = jobAdderSearchTerm.toLowerCase();
      return (
        `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchLower) ||
        candidate.email?.toLowerCase().includes(searchLower) ||
        candidate.currentPosition?.toLowerCase().includes(searchLower) ||
        candidate.company?.toLowerCase().includes(searchLower)
      );
    });
  }, [jobAdderCandidates, jobAdderSearchTerm]);

  // Pagination
  const {
    paginatedItems: paginatedApplications,
    totalPages: applicationsTotalPages,
    hasNextPage: applicationsHasNextPage,
    hasPreviousPage: applicationsHasPreviousPage,
  } = usePagination(filteredApplications, CANDIDATES_PER_PAGE, currentPage);

  const {
    paginatedItems: paginatedJobAdderCandidates,
    totalPages: jobAdderTotalPages,
    hasNextPage: jobAdderHasNextPage,
    hasPreviousPage: jobAdderHasPreviousPage,
  } = usePagination(filteredJobAdderCandidates, CANDIDATES_PER_PAGE, jobAdderCurrentPage);

  // Get unique values for filters
  const uniqueStatuses = useMemo(
    () => [...new Set(applications.map(app => app.status.name).filter(Boolean))],
    [applications]
  );

  const uniqueSources = useMemo(
    () => [...new Set(applications.map(app => app.source).filter(Boolean))],
    [applications]
  );

  const uniqueJobAdderStatuses = useMemo(
    () => [...new Set(jobAdderCandidates.map(c => c.status?.name).filter(Boolean))],
    [jobAdderCandidates]
  );

  const uniqueJobAdderSources = useMemo(
    () => [...new Set(jobAdderCandidates.map(c => c.source).filter(Boolean))],
    [jobAdderCandidates]
  );

  // Event handlers
  const handleApplicationSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    refetch(value);
  }, [refetch]);

  const handleJobAdderSearch = useCallback((value: string) => {
    setJobAdderSearchTerm(value);
    setJobAdderCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  }, []);

  const handleSourceChange = useCallback((value: string) => {
    setSelectedSource(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJobAdderPageChange = (page: number) => {
    setJobAdderCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRefresh = () => {
    refetch();
    refetchJobAdder();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "application review":
      case "available": 
        return "bg-green-100 text-green-800";
      case "interview scheduled":
      case "interviewing": 
        return "bg-yellow-100 text-yellow-800"; 
      case "offer extended":
      case "hired": 
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  const getWorkflowStageColor = (stage?: string) => {
    if (!stage) return "bg-gray-100 text-gray-800";
    
    switch (stage.toLowerCase()) {
      case "initial review":
        return "bg-blue-100 text-blue-800";
      case "phone interview":
        return "bg-yellow-100 text-yellow-800";
      case "final decision":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading candidates...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalCandidates = applications.length + jobAdderCandidates.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <CandidatesHeader 
        candidateCount={totalCandidates} 
        isLoading={loading || jobAdderLoading} 
        onRefresh={handleRefresh} 
      />

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications">Job Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="jobadder">JobAdder Candidates ({jobAdderCandidates.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="applications" className="space-y-6">
          {error && useMockData && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error} - Showing sample applications for demonstration.
              </AlertDescription>
            </Alert>
          )}

          <CandidatesFilters
            searchTerm={searchTerm}
            selectedStatus={selectedStatus}
            selectedSource={selectedSource}
            uniqueStatuses={uniqueStatuses}
            uniqueSources={uniqueSources}
            onSearchChange={handleApplicationSearch}
            onStatusChange={handleStatusChange}
            onSourceChange={handleSourceChange}
          />

          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading applications...</p>
              </div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No applications found matching your search.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                <span>
                  Showing {(currentPage - 1) * CANDIDATES_PER_PAGE + 1}-
                  {Math.min(currentPage * CANDIDATES_PER_PAGE, filteredApplications.length)} of {filteredApplications.length} applications
                  (Page {currentPage} of {applicationsTotalPages})
                </span>
              </div>

              <div className="grid gap-6">
                {paginatedApplications.map((application) => (
                  <Card key={application.applicationId} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${application.candidate.firstName}${application.candidate.lastName}`} />
                          <AvatarFallback className="text-lg">
                            {`${application.candidate.firstName[0]}${application.candidate.lastName[0]}`}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <CardTitle className="text-xl">
                                {application.candidate.salutation ? `${application.candidate.salutation} ` : ''}{application.candidate.firstName} {application.candidate.lastName}
                              </CardTitle>
                              <CardDescription className="text-base font-medium">
                                Applied for: {application.jobTitle}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Badge className={getStatusColor(application.status.name)}>
                                {application.status.name}
                              </Badge>
                              {application.status.workflow?.stage && (
                                <Badge variant="outline" className={getWorkflowStageColor(application.status.workflow.stage)}>
                                  {application.status.workflow.stage}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              {application.job.company?.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {application.candidate.address ? `${application.candidate.address.city}, ${application.candidate.address.state}` : application.job.location?.name}
                            </span>
                            {application.candidate.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                {application.candidate.rating}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Applied: {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>

                          {/* Application Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <span className="font-medium">Application ID:</span>
                              <p className="text-muted-foreground">{application.applicationId}</p>
                            </div>
                            <div>
                              <span className="font-medium">Job Reference:</span>
                              <p className="text-muted-foreground">{application.jobReference || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="font-medium">Source:</span>
                              <p className="text-muted-foreground">{application.source || 'Direct Application'}</p>
                            </div>
                          </div>

                          {/* Workflow Progress */}
                          {application.status.workflow && (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">Progress:</span>
                                <Badge variant="outline">
                                  Step {application.status.workflow.step} of {application.status.workflow.stageIndex + 2}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {application.status.workflow.progress}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pt-4">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {application.candidate.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {application.candidate.phone || application.candidate.mobile || 'N/A'}
                            </span>
                            {application.rating && (
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                Rating: {application.rating}/5
                              </span>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Resume
                            </Button>
                            <Button variant="outline" size="sm">Contact</Button>
                            <Button size="sm">View Application</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {applicationsTotalPages > 1 && (
                <CandidatesPagination
                  currentPage={currentPage}
                  totalPages={applicationsTotalPages}
                  hasNextPage={applicationsHasNextPage}
                  hasPreviousPage={applicationsHasPreviousPage}
                  handlePageChange={handlePageChange}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="jobadder" className="space-y-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name, email, position, or company..."
                value={jobAdderSearchTerm}
                onChange={(e) => handleJobAdderSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {jobAdderError && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {typeof jobAdderError === 'string' ? jobAdderError : jobAdderError.message}
              </AlertDescription>
            </Alert>
          )}

          {jobAdderLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading JobAdder candidates...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                <span>
                  Showing {(jobAdderCurrentPage - 1) * CANDIDATES_PER_PAGE + 1}-
                  {Math.min(jobAdderCurrentPage * CANDIDATES_PER_PAGE, filteredJobAdderCandidates.length)} of {filteredJobAdderCandidates.length} candidates
                  (Page {jobAdderCurrentPage} of {jobAdderTotalPages})
                </span>
              </div>

              <JobAdderCandidatesList 
                candidates={paginatedJobAdderCandidates}
                onImportCandidate={importCandidate}
                importingCandidates={importingCandidates}
              />

              {jobAdderTotalPages > 1 && (
                <CandidatesPagination
                  currentPage={jobAdderCurrentPage}
                  totalPages={jobAdderTotalPages}
                  hasNextPage={jobAdderHasNextPage}
                  hasPreviousPage={jobAdderHasPreviousPage}
                  handlePageChange={handleJobAdderPageChange}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
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
