import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Mail, Phone, Search, Star, Download, AlertCircle, Building, Calendar, User, RefreshCw } from "lucide-react";
import { useJobApplications } from "@/hooks/useJobApplications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JobAdderCandidate {
  candidateId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  currentPosition?: string;
  company?: string;
  skills?: string[];
  rating?: number;
  status?: {
    name: string;
    statusId: number;
  };
  source?: string;
  createdAt?: string;
  linkedinUrl?: string;
  profilePictureUrl?: string;
}

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [jobAdderSearchTerm, setJobAdderSearchTerm] = useState("");
  const [importingCandidates, setImportingCandidates] = useState<Set<string>>(new Set());
  const [jobAdderCandidates, setJobAdderCandidates] = useState<JobAdderCandidate[]>([]);
  const [jobAdderLoading, setJobAdderLoading] = useState(false);
  const [jobAdderError, setJobAdderError] = useState<string | null>(null);
  const { applications, loading, error, useMockData, refetch } = useJobApplications();
  const { toast } = useToast();

  const fetchJobAdderCandidates = async (search?: string) => {
    setJobAdderLoading(true);
    setJobAdderError(null);

    try {
      // Get user access token from OAuth2 manager
      const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
      const userAccessToken = await oauth2Manager.getValidAccessToken();
      
      if (!userAccessToken) {
        throw new Error('No JobAdder access token available. Please authenticate first.');
      }

      const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'candidates',
          limit: 50,
          offset: 0,
          search: search,
          accessToken: userAccessToken
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.items) {
        setJobAdderCandidates(data.items);
        console.log('Fetched JobAdder candidates:', data.items.length);
      } else {
        setJobAdderCandidates([]);
        setJobAdderError('No candidates found');
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setJobAdderError(err instanceof Error ? err.message : 'Failed to fetch candidates');
      setJobAdderCandidates([]);
    } finally {
      setJobAdderLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    refetch(value);
  };

  const handleJobAdderSearch = (value: string) => {
    setJobAdderSearchTerm(value);
    fetchJobAdderCandidates(value);
  };

  const handleRefreshJobAdder = () => {
    fetchJobAdderCandidates(jobAdderSearchTerm);
  };

  const handleImportCandidate = async (candidate: any) => {
    const candidateId = candidate.candidateId?.toString() || '';
    setImportingCandidates(prev => new Set([...prev, candidateId]));
    
    try {
      // Get user access token from OAuth2 manager
      const { default: oauth2Manager } = await import('@/lib/oauth2-manager');
      const userAccessToken = await oauth2Manager.getValidAccessToken();
      
      if (!userAccessToken) {
        throw new Error('No JobAdder access token available. Please authenticate first.');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'import-candidate',
          candidate: candidate,
          accessToken: userAccessToken
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Candidate Imported Successfully",
        description: `${candidate.firstName} ${candidate.lastName} has been imported to your candidate database.`,
      });

      console.log('Candidate imported:', data);
    } catch (error) {
      console.error('Error importing candidate:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Failed to import candidate',
        variant: "destructive"
      });
    } finally {
      setImportingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
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

  const getJobAdderStatusColor = (status?: string) => {
    if (!status) return "bg-gray-100 text-gray-800";
    
    switch (status.toLowerCase()) {
      case "available":
      case "active": 
        return "bg-green-100 text-green-800";
      case "interviewing":
      case "in process": 
        return "bg-yellow-100 text-yellow-800"; 
      case "hired":
      case "placed": 
        return "bg-blue-100 text-blue-800";
      case "unavailable":
      case "inactive":
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

  useEffect(() => {
    fetchJobAdderCandidates();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground mt-2">Manage candidates from your applications and JobAdder</p>
        </div>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications">Job Applications</TabsTrigger>
          <TabsTrigger value="jobadder">JobAdder Candidates</TabsTrigger>
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

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name, job title, email, or company..."
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
                <p className="text-muted-foreground">Loading applications...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No applications found matching your search.</p>
                </div>
              ) : (
                applications.map((application) => (
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleImportCandidate(application.candidate)}
                        disabled={importingCandidates.has(application.candidate.candidateId?.toString() || '')}
                      >
                        {importingCandidates.has(application.candidate.candidateId?.toString() || '') ? (
                          <>
                            <Download className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Import Candidate
                          </>
                        )}
                      </Button>
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
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobadder" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex-1 mr-4">
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
            
            <Button 
              onClick={handleRefreshJobAdder}
              disabled={jobAdderLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${jobAdderLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {jobAdderError && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {jobAdderError}
                {jobAdderError.includes('authenticate') && (
                  <span className="block mt-2">
                    Please go to <a href="/jobadder-auth" className="underline">JobAdder Auth</a> to connect your account.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {jobAdderLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                      </div>
                    </div>
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
          ) : jobAdderCandidates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No JobAdder candidates found.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobAdderCandidates.map((candidate) => (
                <Card key={candidate.candidateId} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage 
                          src={candidate.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${candidate.firstName}${candidate.lastName}`} 
                        />
                        <AvatarFallback className="text-lg">
                          {`${candidate.firstName[0]}${candidate.lastName[0]}`}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg line-clamp-2">
                              {candidate.firstName} {candidate.lastName}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <Building className="h-4 w-4" />
                              {candidate.currentPosition || 'Position not specified'}
                            </CardDescription>
                          </div>
                          {candidate.status && (
                            <Badge className={getJobAdderStatusColor(candidate.status.name)}>
                              {candidate.status.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {candidate.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {candidate.email}
                        </div>
                      )}
                      
                      {(candidate.phone || candidate.mobile) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {candidate.phone || candidate.mobile}
                        </div>
                      )}
                      
                      {candidate.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {candidate.address.city && candidate.address.state 
                            ? `${candidate.address.city}, ${candidate.address.state}`
                            : candidate.address.city || candidate.address.state || 'Location not specified'}
                        </div>
                      )}
                      
                      {candidate.company && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="h-4 w-4" />
                          {candidate.company}
                        </div>
                      )}
                      
                      {candidate.rating && (
                        <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {candidate.rating}/5
                        </div>
                      )}
                      
                      {candidate.createdAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Added: {new Date(candidate.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {candidate.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          ID: {candidate.candidateId}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1" 
                          onClick={() => handleImportCandidate(candidate)}
                          disabled={importingCandidates.has(candidate.candidateId)}
                        >
                          {importingCandidates.has(candidate.candidateId) ? (
                            <>
                              <Download className="h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Import
                            </>
                          )}
                        </Button>
                        <Button size="sm" className="gap-1">
                          View Profile
                          <User className="h-4 w-4" />
                        </Button>
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

export default Candidates;