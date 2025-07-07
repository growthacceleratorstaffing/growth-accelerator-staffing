import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  RefreshCw, 
  Users, 
  Briefcase, 
  Search,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import oauth2Manager from "@/lib/oauth2-manager";
import { useNavigate } from 'react-router-dom';

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

const JobAdderImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobAdderJob[]>([]);
  const [candidates, setCandidates] = useState<JobAdderCandidate[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      const authenticated = oauth2Manager.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await Promise.all([loadJobs(), loadCandidates()]);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to verify JobAdder connection. Please re-authenticate.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
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
      setJobs(data.items || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast({
        title: "Load Error",
        description: "Failed to load jobs from JobAdder",
        variant: "destructive"
      });
    }
  };

  const loadCandidates = async () => {
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
      setCandidates(data.items || []);
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
          const job = jobs.find(j => j.adId === jobId);
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
          const candidate = candidates.find(c => c.candidateId === candidateId);
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

      // Clear selections
      setSelectedJobs(new Set());
      setSelectedCandidates(new Set());
      
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

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCandidates = candidates.filter(candidate =>
    `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.currentPosition?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading JobAdder data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
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
                <Button onClick={() => navigate('/auth/login')}>
                  Connect to JobAdder
                </Button>
                <Button variant="outline" onClick={() => navigate('/jobs')}>
                  View Local Jobs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import from JobAdder</h1>
        <p className="text-muted-foreground">
          Browse and import jobs and candidates from your JobAdder account
        </p>
      </div>

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            Jobs ({filteredJobs.length})
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidates ({filteredCandidates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {filteredJobs.length === 0 ? (
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
                    checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedJobs(new Set(filteredJobs.map(j => j.adId)));
                      } else {
                        setSelectedJobs(new Set());
                      }
                    }}
                    disabled={importing}
                  />
                  Select All Jobs
                </Label>
              </div>
              
              {filteredJobs.map((job) => (
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
          {filteredCandidates.length === 0 ? (
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
                    checked={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCandidates(new Set(filteredCandidates.map(c => c.candidateId)));
                      } else {
                        setSelectedCandidates(new Set());
                      }
                    }}
                    disabled={importing}
                  />
                  Select All Candidates
                </Label>
              </div>
              
              {filteredCandidates.map((candidate) => (
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
                        
                        {candidate.currentPosition && (
                          <p className="text-sm font-medium">{candidate.currentPosition}</p>
                        )}
                        
                        {candidate.company && (
                          <p className="text-sm text-muted-foreground">at {candidate.company}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {candidate.location && <Badge variant="secondary">{candidate.location}</Badge>}
                          {candidate.phone && <Badge variant="secondary">{candidate.phone}</Badge>}
                          {candidate.experience && <Badge variant="secondary">{candidate.experience} years exp</Badge>}
                        </div>
                        
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
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
    </div>
  );
};

export default JobAdderImport;