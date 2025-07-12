import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Briefcase, 
  Settings, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  Search,
  Send,
  Building,
  MapPin,
  Clock,
  DollarSign,
  Download,
  Upload
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import oauth2Manager from "@/lib/oauth2-manager";

interface JobBoard {
  boardId: number;
  name: string;
  reference: string;
}

interface JobAd {
  adId: number;
  title: string;
  reference: string;
  summary: string;
  bulletPoints?: string[];
  description?: string;
  portal?: {
    hotJob?: boolean;
    salary?: {
      ratePer?: string;
      rateLow?: number;
      rateHigh?: number;
      details?: string;
    };
    template?: string;
  };
  postedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
}

interface JobApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: {
    street?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  employment?: {
    current?: {
      employer?: string;
      position?: string;
      workTypeId?: number;
    };
  };
  availability?: {
    immediate?: boolean;
  };
  skillTags?: string[];
}

export const JobBoardManager = () => {
  const [jobBoards, setJobBoards] = useState<JobBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<JobBoard | null>(null);
  const [jobAds, setJobAds] = useState<JobAd[]>([]);
  const [selectedJobAd, setSelectedJobAd] = useState<JobAd | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isJobAdderConnected, setIsJobAdderConnected] = useState(false);
  const [applicationData, setApplicationData] = useState<JobApplicationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    address: {
      street: [""],
      city: "",
      state: "",
      postalCode: "",
      countryCode: "AU"
    },
    employment: {
      current: {
        employer: "",
        position: "",
        workTypeId: 1
      }
    },
    availability: {
      immediate: true
    },
    skillTags: []
  });
  const { toast } = useToast();

  useEffect(() => {
    loadJobBoards();
    checkJobAdderConnection();
  }, []);

  const checkJobAdderConnection = async () => {
    try {
      const isAuthenticated = await oauth2Manager.isAuthenticated();
      setIsJobAdderConnected(isAuthenticated);
    } catch (error) {
      console.error('Failed to check JobAdder connection:', error);
      setIsJobAdderConnected(false);
    }
  };

  const handleSetupOAuth = async () => {
    try {
      const authUrl = await oauth2Manager.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get OAuth URL:', error);
      toast({
        title: "Setup Failed",
        description: "Failed to initiate JobAdder OAuth setup",
        variant: "destructive"
      });
    }
  };

  const loadJobBoards = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'jobboards'
        },
        headers: {
          'x-user-id': user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to load job boards');
      }

      setJobBoards(data.data.items || []);
      
      // Auto-select the default board (8734 - Startup Accelerator)
      const defaultBoard = data.data.items?.find((board: JobBoard) => board.boardId === 8734);
      if (defaultBoard) {
        setSelectedBoard(defaultBoard);
        loadJobAds(defaultBoard.boardId);
      }
    } catch (error) {
      console.error('Failed to load job boards:', error);
      toast({
        title: "Load Error",
        description: "Failed to load job boards from JobAdder",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadJobAds = async (boardId: number, searchTerm?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const requestBody: any = { 
        endpoint: 'jobboard-jobads',
        jobboardId: boardId.toString(),
        limit: 100,
        offset: 0
      };

      // Add search filters if provided
      if (searchTerm) {
        requestBody.search = searchTerm;
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: requestBody,
        headers: {
          'x-user-id': user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to load job ads');
      }

      let filteredJobs = data.data.items || [];
      
      // Apply client-side filtering if search term provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredJobs = filteredJobs.filter((job: JobAd) => 
          job.title?.toLowerCase().includes(searchLower) ||
          job.summary?.toLowerCase().includes(searchLower) ||
          job.reference?.toLowerCase().includes(searchLower)
        );
      }

      setJobAds(filteredJobs);
    } catch (error) {
      console.error('Failed to load job ads:', error);
      toast({
        title: "Load Error",
        description: "Failed to load job ads from JobAdder",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBoardChange = (boardId: string) => {
    const board = jobBoards.find(b => b.boardId.toString() === boardId);
    if (board) {
      setSelectedBoard(board);
      setJobAds([]);
      loadJobAds(board.boardId);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (selectedBoard) {
      loadJobAds(selectedBoard.boardId, query);
    }
  };

  const handleApplyClick = (jobAd: JobAd) => {
    setSelectedJobAd(jobAd);
    setShowApplicationForm(true);
  };

  const submitApplication = async () => {
    if (!selectedJobAd || !selectedBoard) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          endpoint: 'submit-job-application',
          boardId: selectedBoard.boardId?.toString(),
          adId: selectedJobAd.adId.toString(),
          application: applicationData
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Application Submitted",
        description: `Successfully submitted application for ${selectedJobAd.title}`,
      });

      setShowApplicationForm(false);
      setSelectedJobAd(null);
      setApplicationData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        mobile: "",
        address: {
          street: [""],
          city: "",
          state: "",
          postalCode: "",
          countryCode: "AU"
        },
        employment: {
          current: {
            employer: "",
            position: "",
            workTypeId: 1
          }
        },
        availability: {
          immediate: true
        },
        skillTags: []
      });
    } catch (error) {
      console.error('Failed to submit application:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit job application",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const importJobToDatabase = async (jobAd: JobAd) => {
    if (!selectedBoard) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: {
          endpoint: 'import-job',
          job: jobAd
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Job Imported",
        description: `Successfully imported "${jobAd.title}" to your job database`,
      });

      console.log('Job imported successfully:', data);
    } catch (error) {
      console.error('Failed to import job:', error);
      toast({
        title: "Import Failed", 
        description: `Failed to import job: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const importAllJobs = async () => {
    if (jobAds.length === 0) return;

    setLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const jobAd of jobAds) {
        try {
          const { data, error } = await supabase.functions.invoke('jobadder-api', {
            body: {
              endpoint: 'import-job',
              job: jobAd
            }
          });

          if (error) {
            throw new Error(error.message);
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to import job ${jobAd.title}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Bulk Import Complete",
        description: `Imported ${successCount} jobs successfully. ${errorCount} failed.`,
        variant: errorCount > 0 ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Failed to import jobs:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* JobAdder Connection Status - Information Only */}
      {!isJobAdderConnected && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              JobAdder Not Connected
            </CardTitle>
            <CardDescription>
              JobAdder integration is required to access job boards and submit applications. 
              Please complete the authentication setup in your account settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {/* Job Board Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Job Board Configuration
          </CardTitle>
          <CardDescription>
            Select and configure JobAdder job boards for job listings and applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="jobboard-select">Job Board</Label>
              <Select
                value={selectedBoard?.boardId?.toString() || ""}
                onValueChange={handleBoardChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job board" />
                </SelectTrigger>
                <SelectContent>
                  {jobBoards.filter(board => board?.boardId).map((board) => (
                    <SelectItem key={board.boardId} value={board.boardId.toString()}>
                      {board.name} ({board.reference})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadJobBoards} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {selectedBoard && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Connected to <strong>{selectedBoard.name}</strong> (ID: {selectedBoard.boardId})
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jobs">Job Listings ({jobAds.length})</TabsTrigger>
          <TabsTrigger value="application" disabled={!showApplicationForm}>
            {showApplicationForm ? 'Apply for Job' : 'Job Application'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search job ads..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {jobAds.length > 0 && (
              <Button onClick={importAllJobs} disabled={loading} variant="secondary">
                <Upload className="h-4 w-4 mr-2" />
                Import All Jobs ({jobAds.length})
              </Button>
            )}
          </div>

          {/* Job Ads List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : jobAds.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {selectedBoard ? 'No job ads found' : 'Select a job board to view job ads'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {jobAds.map((jobAd) => (
                <Card key={jobAd.adId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">{jobAd.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              Ref: {jobAd.reference}
                            </span>
                            {jobAd.postedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(jobAd.postedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {jobAd.portal?.hotJob && (
                            <Badge variant="destructive">Hot Job</Badge>
                          )}
                          <Badge variant="outline">ID: {jobAd.adId}</Badge>
                        </div>
                      </div>

                      {jobAd.summary && (
                        <p className="text-muted-foreground">{jobAd.summary}</p>
                      )}

                      {jobAd.portal?.salary && (
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <DollarSign className="h-4 w-4" />
                          {jobAd.portal.salary.rateLow && jobAd.portal.salary.rateHigh
                            ? `$${jobAd.portal.salary.rateLow} - $${jobAd.portal.salary.rateHigh} per ${jobAd.portal.salary.ratePer || 'Year'}`
                            : jobAd.portal.salary.details || 'Competitive'
                          }
                        </div>
                      )}

                      {jobAd.bulletPoints && jobAd.bulletPoints.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {jobAd.bulletPoints.slice(0, 5).map((point, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {point}
                            </Badge>
                          ))}
                          {jobAd.bulletPoints.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{jobAd.bulletPoints.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <div className="text-sm text-muted-foreground">
                          {jobAd.expiresAt && (
                            <span>Expires: {new Date(jobAd.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => importJobToDatabase(jobAd)}
                            disabled={loading}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Import Job
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button onClick={() => handleApplyClick(jobAd)} size="sm">
                            <Send className="h-4 w-4 mr-2" />
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="application">
          {selectedJobAd && (
            <Card>
              <CardHeader>
                <CardTitle>Apply for {selectedJobAd.title}</CardTitle>
                <CardDescription>
                  Complete the application form to apply for this position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={applicationData.firstName}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        firstName: e.target.value
                      }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={applicationData.lastName}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        lastName: e.target.value
                      }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={applicationData.email}
                    onChange={(e) => setApplicationData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={applicationData.phone}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={applicationData.mobile}
                      onChange={(e) => setApplicationData(prev => ({
                        ...prev,
                        mobile: e.target.value
                      }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Current Employment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employer">Current Employer</Label>
                      <Input
                        id="employer"
                        value={applicationData.employment?.current?.employer}
                        onChange={(e) => setApplicationData(prev => ({
                          ...prev,
                          employment: {
                            ...prev.employment,
                            current: {
                              ...prev.employment?.current,
                              employer: e.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Current Position</Label>
                      <Input
                        id="position"
                        value={applicationData.employment?.current?.position}
                        onChange={(e) => setApplicationData(prev => ({
                          ...prev,
                          employment: {
                            ...prev.employment,
                            current: {
                              ...prev.employment?.current,
                              position: e.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowApplicationForm(false);
                      setSelectedJobAd(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={submitApplication} disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};