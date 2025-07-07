import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MapPin, Building, Clock, DollarSign, Search, AlertCircle, ExternalLink, Download, RefreshCw, Users, Briefcase, CheckCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { JobSyncStatus } from "@/components/job-search/JobSyncStatus";
import { JobApplicationForm } from "@/components/job-search/JobApplicationForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";

interface JobAdderJob {
  adId: number;
  title: string;
  company: {
    name: string;
    companyId: number;
  };
  location: {
    name: string;
    locationId: number;
  };
  workType: {
    name: string;
    workTypeId: number;
  };
  category: {
    name: string;
    categoryId: number;
  };
  summary: string;
  salary?: {
    rateLow?: number;
    rateHigh?: number;
    ratePer?: string;
    currency?: string;
  };
}

interface JobAdderCandidate {
  candidateId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentPosition?: string;
  company?: string;
  location?: string;
  skills?: string[];
  experience?: number;
}

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  
  // JobAdder Import state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [jobAdderJobs, setJobAdderJobs] = useState<JobAdderJob[]>([]);
  const [jobAdderCandidates, setJobAdderCandidates] = useState<JobAdderCandidate[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSearchQuery, setImportSearchQuery] = useState("");
  
  const { toast } = useToast();
  
  const { jobs, loading, error, useMockData, refetch } = useJobs();

  const testJobAdderAPI = async () => {
    setIsTestingAPI(true);
    try {
      console.log('Testing JobAdder API health...');
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { endpoint: 'health' }
      });
      
      if (error) {
        console.error('JobAdder API test failed:', error);
        toast({
          title: "API Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('JobAdder API test success:', data);
        toast({
          title: "API Test Successful",
          description: `Status: ${data.status}, Has credentials: ${data.credentials?.hasClientId && data.credentials?.hasClientSecret}`,
        });
      }
    } catch (err) {
      console.error('API test exception:', err);
      toast({
        title: "API Test Exception",
        description: `Exception: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingAPI(false);
    }
  };

  // JobAdder Import functions
  const checkAuthentication = async () => {
    try {
      setImportLoading(true);
      const authenticated = oauth2Manager.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await Promise.all([loadJobAdderJobs(), loadJobAdderCandidates()]);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to verify JobAdder connection. Please re-authenticate.",
        variant: "destructive"
      });
    } finally {
      setImportLoading(false);
    }
  };

  const loadJobAdderJobs = async () => {
    try {
      const token = await oauth2Manager.getValidAccessToken();
      if (!token) throw new Error('No valid access token');

      const response = await fetch('/functions/v1/jobadder-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: 'jobboards',
          boardId: '8734',
          limit: '100'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to load jobs: ${response.status}`);
      }

      const data = await response.json();
      setJobAdderJobs(data.items || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast({
        title: "Load Error",
        description: "Failed to load jobs from JobAdder",
        variant: "destructive"
      });
    }
  };

  const loadJobAdderCandidates = async () => {
    try {
      const token = await oauth2Manager.getValidAccessToken();
      if (!token) throw new Error('No valid access token');

      const response = await fetch('/functions/v1/jobadder-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: 'candidates',
          limit: '100'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to load candidates: ${response.status}`);
      }

      const data = await response.json();
      setJobAdderCandidates(data.items || []);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      toast({
        title: "Load Error",
        description: "Failed to load candidates from JobAdder",
        variant: "destructive"
      });
    }
  };

  const handleJobSelection = (jobId: number, checked: boolean) => {
    const newSelection = new Set(selectedJobs);
    if (checked) {
      newSelection.add(jobId);
    } else {
      newSelection.delete(jobId);
    }
    setSelectedJobs(newSelection);
  };

  const handleCandidateSelection = (candidateId: number, checked: boolean) => {
    const newSelection = new Set(selectedCandidates);
    if (checked) {
      newSelection.add(candidateId);
    } else {
      newSelection.delete(candidateId);
    }
    setSelectedCandidates(newSelection);
  };

  const importSelected = async () => {
    if (selectedJobs.size === 0 && selectedCandidates.size === 0) {
      toast({
        title: "Nothing Selected",
        description: "Please select jobs or candidates to import",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    
    const totalItems = selectedJobs.size + selectedCandidates.size;
    let completed = 0;

    try {
      const token = await oauth2Manager.getValidAccessToken();
      if (!token) throw new Error('No valid access token');

      // Import selected jobs
      for (const jobId of selectedJobs) {
        try {
          const job = jobAdderJobs.find(j => j.adId === jobId);
          if (!job) continue;

          const response = await fetch('/functions/v1/jobadder-api', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              endpoint: 'import-job',
              job: job
            })
          });

          if (!response.ok) {
            console.error(`Failed to import job ${jobId}`);
          }
          
          completed++;
          setImportProgress((completed / totalItems) * 100);
        } catch (error) {
          console.error(`Error importing job ${jobId}:`, error);
        }
      }

      // Import selected candidates
      for (const candidateId of selectedCandidates) {
        try {
          const candidate = jobAdderCandidates.find(c => c.candidateId === candidateId);
          if (!candidate) continue;

          const response = await fetch('/functions/v1/jobadder-api', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              endpoint: 'import-candidate',
              candidate: candidate
            })
          });

          if (!response.ok) {
            console.error(`Failed to import candidate ${candidateId}`);
          }
          
          completed++;
          setImportProgress((completed / totalItems) * 100);
        } catch (error) {
          console.error(`Error importing candidate ${candidateId}:`, error);
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${completed} items from JobAdder`,
      });

      // Clear selections and refresh local jobs
      setSelectedJobs(new Set());
      setSelectedCandidates(new Set());
      refetch(); // Refresh the local jobs list
      
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import selected items",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    refetch(value);
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  const handleCloseForm = () => {
    setShowApplicationForm(false);
    setSelectedJob(null);
  };

  // Filter functions for import
  const filteredJobAdderJobs = jobAdderJobs.filter(job =>
    job.title.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    job.company.name.toLowerCase().includes(importSearchQuery.toLowerCase())
  );

  const filteredJobAdderCandidates = jobAdderCandidates.filter(candidate =>
    `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    candidate.email.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    candidate.currentPosition?.toLowerCase().includes(importSearchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vacancies</h1>
          <p className="text-muted-foreground mt-2">Find your next opportunity - synced with JobAdder</p>
        </div>
      </div>

      {/* Sync Status */}
      <div className="mb-8">
        <JobSyncStatus />
        <div className="mt-4 flex gap-2">
          <Button 
            onClick={testJobAdderAPI} 
            disabled={isTestingAPI}
            variant="outline"
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            {isTestingAPI ? "Testing API..." : "Test JobAdder API"}
          </Button>
        </div>
      </div>

      {error && useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} - Showing sample job listings for demonstration.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="vacancies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vacancies" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Vacancies ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2" onClick={checkAuthentication}>
            <Download className="h-4 w-4" />
            Import from JobAdder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacancies" className="space-y-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vacancies, companies, or locations..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading vacancies...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No vacancies found matching your search.</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <Card key={job.adId} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
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
                            {new Date(job.postAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{job.summary}</p>
                      <div className="flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 font-semibold">
                            <DollarSign className="h-4 w-4" />
                            {job.salary 
                              ? `$${job.salary.rateLow?.toLocaleString()} - $${job.salary.rateHigh?.toLocaleString()}` 
                              : 'Competitive'
                            }
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Ref: {job.reference}
                            </span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              JobAdder
                            </Badge>
                          </div>
                        </div>
                         <div className="flex gap-2">
                           <Link to={`/jobs/${job.adId}`}>
                             <Button variant="outline">View Details</Button>
                           </Link>
                           <Button onClick={() => handleApplyClick(job)}>Apply Now</Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          {importLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading JobAdder data...</p>
              </div>
            </div>
          ) : !isAuthenticated ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                  JobAdder Authentication Required
                </CardTitle>
                <CardDescription>
                  You need to authenticate with JobAdder before you can import jobs and candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please connect to JobAdder first to access job and candidate data for import.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-4">
                    <Button onClick={() => window.open('/jobadder-auth', '_blank')}>
                      Connect to JobAdder
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Import Progress */}
              {importing && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Importing selected items...</span>
                        <span className="text-sm text-muted-foreground">{Math.round(importProgress)}%</span>
                      </div>
                      <Progress value={importProgress} className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs and candidates..."
                      value={importSearchQuery}
                      onChange={(e) => setImportSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={importSelected}
                    disabled={importing || (selectedJobs.size === 0 && selectedCandidates.size === 0)}
                    className="flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Import Selected ({selectedJobs.size + selectedCandidates.size})
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" onClick={checkAuthentication}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="jobs" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="jobs" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Jobs ({filteredJobAdderJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="candidates" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Candidates ({filteredJobAdderCandidates.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="jobs" className="space-y-4">
                  {filteredJobAdderJobs.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No jobs found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <Label className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedJobs.size === filteredJobAdderJobs.length && filteredJobAdderJobs.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedJobs(new Set(filteredJobAdderJobs.map(j => j.adId)));
                              } else {
                                setSelectedJobs(new Set());
                              }
                            }}
                            disabled={importing}
                          />
                          Select All Jobs
                        </Label>
                      </div>
                      
                      {filteredJobAdderJobs.map((job) => (
                        <Card key={job.adId} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={selectedJobs.has(job.adId)}
                                onCheckedChange={(checked) => handleJobSelection(job.adId, checked as boolean)}
                                disabled={importing}
                                className="mt-1"
                              />
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold text-lg">{job.title}</h3>
                                    <p className="text-muted-foreground">{job.company.name}</p>
                                  </div>
                                  <Badge variant="outline">ID: {job.adId}</Badge>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary">{job.location.name}</Badge>
                                  <Badge variant="secondary">{job.workType.name}</Badge>
                                  {job.category && <Badge variant="secondary">{job.category.name}</Badge>}
                                </div>
                                
                                {job.salary && (
                                  <p className="text-sm text-muted-foreground">
                                    Salary: {job.salary.rateLow && job.salary.rateHigh 
                                      ? `${job.salary.currency || '$'}${job.salary.rateLow} - ${job.salary.currency || '$'}${job.salary.rateHigh}`
                                      : 'Competitive'
                                    } {job.salary.ratePer && `per ${job.salary.ratePer}`}
                                  </p>
                                )}
                                
                                {job.summary && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {job.summary}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="candidates" className="space-y-4">
                  {filteredJobAdderCandidates.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No candidates found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <Label className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCandidates.size === filteredJobAdderCandidates.length && filteredJobAdderCandidates.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCandidates(new Set(filteredJobAdderCandidates.map(c => c.candidateId)));
                              } else {
                                setSelectedCandidates(new Set());
                              }
                            }}
                            disabled={importing}
                          />
                          Select All Candidates
                        </Label>
                      </div>
                      
                      {filteredJobAdderCandidates.map((candidate) => (
                        <Card key={candidate.candidateId} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={selectedCandidates.has(candidate.candidateId)}
                                onCheckedChange={(checked) => handleCandidateSelection(candidate.candidateId, checked as boolean)}
                                disabled={importing}
                                className="mt-1"
                              />
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold text-lg">
                                      {candidate.firstName} {candidate.lastName}
                                    </h3>
                                    <p className="text-muted-foreground">{candidate.email}</p>
                                  </div>
                                  <Badge variant="outline">ID: {candidate.candidateId}</Badge>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  {candidate.currentPosition && (
                                    <Badge variant="secondary">{candidate.currentPosition}</Badge>
                                  )}
                                  {candidate.location && (
                                    <Badge variant="secondary">{candidate.location}</Badge>
                                  )}
                                  {candidate.company && (
                                    <Badge variant="secondary">{candidate.company}</Badge>
                                  )}
                                </div>
                                
                                {candidate.phone && (
                                  <p className="text-sm text-muted-foreground">
                                    Phone: {candidate.phone}
                                  </p>
                                )}
                                
                                {candidate.skills && candidate.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {candidate.skills.slice(0, 5).map((skill, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {candidate.skills.length > 5 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{candidate.skills.length - 5} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>
      </Tabs>

      <JobApplicationForm
        job={selectedJob}
        isOpen={showApplicationForm}
        onClose={handleCloseForm}
      />
    </div>
  );
};

export default Jobs;