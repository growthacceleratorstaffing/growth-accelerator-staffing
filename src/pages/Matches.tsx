import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Mail, 
  Phone, 
  Search, 
  Star, 
  AlertCircle, 
  Building, 
  Calendar, 
  User, 
  DollarSign,
  Clock,
  CheckCircle2,
  UserCheck,
  Briefcase,
  Plus,
  Eye,
  Settings
} from "lucide-react";
import { usePlacements } from "@/hooks/usePlacements";
import { usePlacementDetails } from "@/hooks/usePlacementDetails";
import { useCandidates } from "@/hooks/useCandidates";
import { useJobs } from "@/hooks/useJobs";
import { useJobApplications } from "@/hooks/useJobApplications";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import JobAdderAPIExplorer from "@/components/JobAdderAPIExplorer";

const Matches = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewPlacementOpen, setIsNewPlacementOpen] = useState(false);
  const [isManualPlacementOpen, setIsManualPlacementOpen] = useState(false);
  const [isPlacementDetailsOpen, setIsPlacementDetailsOpen] = useState(false);
  const [isManagePlacementOpen, setIsManagePlacementOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("placement"); // placement, candidate, job
  const [placementData, setPlacementData] = useState({
    candidateId: "",
    jobId: "", 
    startDate: "",
    endDate: "",
    salaryRate: "",
    salaryCurrency: "USD",
    salaryRatePer: "Year",
    workTypeId: "",
    statusId: "1",
    notes: ""
  });
  const [newCandidateData, setNewCandidateData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    currentRole: "",
    currentCompany: "",
    skills: "",
    experienceYears: "",
    location: ""
  });
  const [newJobData, setNewJobData] = useState({
    title: "",
    company: "",
    location: "",
    workType: "Full-time",
    salaryLow: "",
    salaryHigh: "",
    currency: "USD",
    description: "",
    requirements: ""
  });
  const { placements, loading, error, useMockData, refetch } = usePlacements();
  const { placementDetails, loading: placementLoading, fetchPlacementDetails, updatePlacementStatus, clearPlacementDetails } = usePlacementDetails();
  const { candidates, loading: candidatesLoading } = useCandidates();
  const { jobs, loading: jobsLoading } = useJobs();
  const { talentPool, loading: talentPoolLoading } = useJobApplications();
  const { toast } = useToast();

  // Filter out already placed candidates from talent pool
  const availableCandidates = talentPool.filter(candidate => {
    // Check if this candidate already has an active placement
    const hasActivePlacement = placements.some(placement => 
      placement.candidate?.candidateId === candidate.candidate.candidateId &&
      (placement.status?.name?.toLowerCase() === 'active' || 
       placement.status?.name?.toLowerCase() === 'pending start')
    );
    return !hasActivePlacement;
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    refetch(value);
  };

  const handleInputChange = (field: string, value: string) => {
    setPlacementData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCandidateInputChange = (field: string, value: string) => {
    setNewCandidateData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleJobInputChange = (field: string, value: string) => {
    setNewJobData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!placementData.candidateId || !placementData.jobId || !placementData.startDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Candidate, Job, Start Date).",
        variant: "destructive"
      });
      return;
    }

    // Find candidate and job details for local storage
    const selectedCandidate = availableCandidates.find(c => 
      c.candidate.candidateId.toString() === placementData.candidateId
    );
    const selectedJob = jobs.find(j => 
      j.adId.toString() === placementData.jobId
    );

    console.log('Selected candidate:', selectedCandidate);
    console.log('Selected job:', selectedJob);
    console.log('Available candidates:', availableCandidates.map(c => ({ id: c.candidate.candidateId, name: `${c.candidate.firstName} ${c.candidate.lastName}` })));
    console.log('Available jobs:', jobs.map(j => ({ id: j.adId, title: j.title })));

    if (!selectedCandidate || !selectedJob) {
      toast({
        title: "Error",
        description: "Could not find candidate or job details.",
        variant: "destructive"
      });
      return;
    }

    let jobAdderPlacementId = null;
    let jobAdderSuccess = false;

    try {
      // Try to create placement via JobAdder API first
      const placementPayload = {
        candidateId: parseInt(placementData.candidateId),
        jobId: parseInt(placementData.jobId),
        startDate: placementData.startDate,
        endDate: placementData.endDate || null,
        salary: placementData.salaryRate ? {
          ratePer: placementData.salaryRatePer,
          rate: parseFloat(placementData.salaryRate),
          currency: placementData.salaryCurrency
        } : null,
        workTypeId: placementData.workTypeId ? parseInt(placementData.workTypeId) : null,
        statusId: parseInt(placementData.statusId),
        notes: placementData.notes
      };

      console.log('Creating placement with payload:', placementPayload);

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'create-placement',
          ...placementPayload
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Placement created successfully in JobAdder:', data);
      jobAdderSuccess = true;
      jobAdderPlacementId = data?.placementId || null;

    } catch (error) {
      console.error('JobAdder API failed:', error);
      // Continue to save locally even if JobAdder fails
    }

    // Always save placement locally (whether JobAdder succeeded or failed)
    try {
      console.log('Attempting to save placement locally with data:', {
        candidate_id: placementData.candidateId,
        candidate_name: `${selectedCandidate.candidate.firstName} ${selectedCandidate.candidate.lastName}`,
        candidate_email: selectedCandidate.candidate.email,
        job_id: placementData.jobId,
        job_title: selectedJob.title,
        company_name: selectedJob.company?.name || 'Unknown Company',
        start_date: placementData.startDate,
        end_date: placementData.endDate || null,
        salary_rate: placementData.salaryRate ? parseFloat(placementData.salaryRate) : null,
        salary_currency: placementData.salaryCurrency,
        salary_rate_per: placementData.salaryRatePer,
        work_type_id: placementData.workTypeId,
        status_id: parseInt(placementData.statusId),
        status_name: 'Active',
        notes: placementData.notes,
        synced_to_jobadder: jobAdderSuccess,
        jobadder_placement_id: jobAdderPlacementId
      });

      const { data: localPlacement, error: localError } = await supabase
        .from('local_placements')
        .insert({
          candidate_id: placementData.candidateId,
          candidate_name: `${selectedCandidate.candidate.firstName} ${selectedCandidate.candidate.lastName}`,
          candidate_email: selectedCandidate.candidate.email,
          job_id: placementData.jobId,
          job_title: selectedJob.title,
          company_name: selectedJob.company?.name || 'Unknown Company',
          start_date: placementData.startDate,
          end_date: placementData.endDate || null,
          salary_rate: placementData.salaryRate ? parseFloat(placementData.salaryRate) : null,
          salary_currency: placementData.salaryCurrency,
          salary_rate_per: placementData.salaryRatePer,
          work_type_id: placementData.workTypeId,
          status_id: parseInt(placementData.statusId),
          status_name: 'Active',
          notes: placementData.notes,
          synced_to_jobadder: jobAdderSuccess,
          jobadder_placement_id: jobAdderPlacementId
        })
        .select()
        .single();

      if (localError) {
        console.error('Local placement creation error:', localError);
        throw localError;
      }

      console.log('Local placement saved successfully:', localPlacement);

      // Show appropriate success message
      if (jobAdderSuccess) {
        toast({
          title: "Placement Created!",
          description: "Placement created in JobAdder and saved locally.",
        });
      } else {
        toast({
          title: "Placement Tracked Locally",
          description: "JobAdder API unavailable. Placement saved locally and will sync when API is available.",
          variant: "default"
        });
      }
      
      // Reset form and close modal
      setPlacementData({
        candidateId: "",
        jobId: "", 
        startDate: "",
        endDate: "",
        salaryRate: "",
        salaryCurrency: "USD",
        salaryRatePer: "Year",
        workTypeId: "",
        statusId: "1",
        notes: ""
      });
      setIsNewPlacementOpen(false);
      refetch();

    } catch (localSaveError) {
      console.error('Failed to save placement locally:', localSaveError);
      
      // If local save fails but JobAdder succeeded, still show partial success
      if (jobAdderSuccess) {
        toast({
          title: "Partial Success",
          description: "Placement created in JobAdder but failed to save locally.",
          variant: "default"
        });
        
        // Reset form and close modal
        setPlacementData({
          candidateId: "",
          jobId: "", 
          startDate: "",
          endDate: "",
          salaryRate: "",
          salaryCurrency: "USD",
          salaryRatePer: "Year",
          workTypeId: "",
          statusId: "1",
          notes: ""
        });
        setIsNewPlacementOpen(false);
        refetch();
      } else {
        // Both JobAdder and local save failed
        toast({
          title: "Error",
          description: "Failed to create placement. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleManualPlacement = async () => {
    try {
      // Validate based on active tab
      if (activeTab === "candidate") {
        if (!newCandidateData.firstName || !newCandidateData.lastName || !newCandidateData.email) {
          toast({
            title: "Error",
            description: "Please fill in all required candidate fields (First Name, Last Name, Email).",
            variant: "destructive"
          });
          return;
        }
        
        let jobAdderSuccess = false;
        
        // Try to create candidate via JobAdder API first
        try {
          const candidatePayload = {
            firstName: newCandidateData.firstName,
            lastName: newCandidateData.lastName,
            email: newCandidateData.email,
            phone: newCandidateData.phone,
            currentRole: newCandidateData.currentRole,
            company: newCandidateData.currentCompany,
            skills: newCandidateData.skills.split(',').map(s => s.trim()).filter(Boolean),
            experienceYears: newCandidateData.experienceYears ? parseInt(newCandidateData.experienceYears) : null,
            location: newCandidateData.location
          };

          const { data, error } = await supabase.functions.invoke('jobadder-api', {
            body: { 
              endpoint: 'create-candidate',
              ...candidatePayload
            }
          });

          if (error) {
            throw new Error(error.message);
          }

          console.log('Candidate created successfully in JobAdder:', data);
          jobAdderSuccess = true;
        } catch (apiError) {
          console.error('JobAdder API failed:', apiError);
          // Continue to save locally
        }

        // Always save candidate locally (whether JobAdder succeeded or failed)
        try {
          const { data: localCandidate, error: localError } = await supabase
            .from('candidates')
            .insert({
              name: `${newCandidateData.firstName} ${newCandidateData.lastName}`,
              email: newCandidateData.email,
              phone: newCandidateData.phone,
              current_position: newCandidateData.currentRole,
              company: newCandidateData.currentCompany,
              skills: newCandidateData.skills.split(',').map(s => s.trim()).filter(Boolean),
              experience_years: newCandidateData.experienceYears ? parseInt(newCandidateData.experienceYears) : null,
              location: newCandidateData.location,
              source_platform: 'manual',
              interview_stage: 'pending'
            })
            .select()
            .single();

          if (localError) {
            throw localError;
          }

          console.log('Local candidate saved:', localCandidate);

          // Show appropriate success message
          if (jobAdderSuccess) {
            toast({
              title: "Candidate Created!",
              description: `${newCandidateData.firstName} ${newCandidateData.lastName} has been added to JobAdder and saved locally.`,
            });
          } else {
            toast({
              title: "Candidate Added Locally",
              description: `${newCandidateData.firstName} ${newCandidateData.lastName} has been saved locally. JobAdder API unavailable.`,
            });
          }
        } catch (localSaveError) {
          console.error('Failed to save candidate locally:', localSaveError);
          
          // If local save fails but JobAdder succeeded, still show partial success
          if (jobAdderSuccess) {
            toast({
              title: "Partial Success",
              description: `${newCandidateData.firstName} ${newCandidateData.lastName} created in JobAdder but failed to save locally.`,
            });
          } else {
            // Both JobAdder and local save failed
            throw new Error('Failed to create candidate both in JobAdder and locally');
          }
        }
      } else if (activeTab === "job") {
        if (!newJobData.title || !newJobData.company) {
          toast({
            title: "Error",
            description: "Please fill in all required job fields (Title, Company).",
            variant: "destructive"
          });
          return;
        }
        
        // Create job via JobAdder API
        const jobPayload = {
          jobTitle: newJobData.title,
          companyId: 1, // Default company ID - would need to be mapped properly
          locationId: 1, // Default location ID - would need to be mapped properly
          workType: newJobData.workType,
          salaryLow: newJobData.salaryLow ? parseFloat(newJobData.salaryLow) : null,
          salaryHigh: newJobData.salaryHigh ? parseFloat(newJobData.salaryHigh) : null,
          currency: newJobData.currency,
          jobDescription: newJobData.description,
          requirements: newJobData.requirements
        };

        const { data, error } = await supabase.functions.invoke('jobadder-api', {
          body: { 
            endpoint: 'create-job',
            ...jobPayload
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        toast({
          title: "Job Created!",
          description: `${newJobData.title} at ${newJobData.company} has been posted to JobAdder.`,
        });
      } else {
        if (!placementData.candidateId || !placementData.jobId || !placementData.startDate) {
          toast({
            title: "Error",
            description: "Please fill in all required placement fields.",
            variant: "destructive"
          });
          return;
        }
        
        // Handle placement creation (same as handleCreatePlacement)
        await handleCreatePlacement(new Event('submit') as any);
        return;
      }
      
      // Reset all forms and close modal
      setNewCandidateData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        currentRole: "",
        currentCompany: "",
        skills: "",
        experienceYears: "",
        location: ""
      });
      setNewJobData({
        title: "",
        company: "",
        location: "",
        workType: "Full-time",
        salaryLow: "",
        salaryHigh: "",
        currency: "USD",
        description: "",
        requirements: ""
      });
      setPlacementData({
        candidateId: "",
        jobId: "", 
        startDate: "",
        endDate: "",
        salaryRate: "",
        salaryCurrency: "USD",
        salaryRatePer: "Year",
        workTypeId: "",
        statusId: "1",
        notes: ""
      });
      setIsManualPlacementOpen(false);
      setActiveTab("placement");
      refetch();
    } catch (error) {
      console.error('Error in manual placement:', error);
      toast({
        title: "Error",
        description: "Failed to create entry. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": 
        return "bg-green-100 text-green-800";
      case "pending start": 
        return "bg-yellow-100 text-yellow-800"; 
      case "completed": 
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  const getWorkTypeColor = (workType?: string) => {
    if (!workType) return "bg-gray-100 text-gray-800";
    
    switch (workType.toLowerCase()) {
      case "full-time permanent":
        return "bg-blue-100 text-blue-800";
      case "full-time contract":
        return "bg-purple-100 text-purple-800";
      case "part-time":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatSalary = (salary?: { rate: number; currency: string; ratePer: string }) => {
    if (!salary) return "Salary not specified";
    
    const formattedRate = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salary.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary.rate);
    
    return `${formattedRate} per ${salary.ratePer.toLowerCase()}`;
  };

  const getDaysUntilStart = (startDate?: string) => {
    if (!startDate) return null;
    
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Started";
    if (diffDays === 0) return "Starts today";
    if (diffDays === 1) return "Starts tomorrow";
    return `Starts in ${diffDays} days`;
  };

  const handleViewDetails = async (placement: any) => {
    setSelectedPlacement(placement);
    setIsPlacementDetailsOpen(true);
    
    try {
      await fetchPlacementDetails(placement.placementId);
    } catch (error) {
      console.error('Failed to fetch placement details:', error);
    }
  };

  const handleManagePlacement = (placement: any) => {
    setSelectedPlacement(placement);
    setIsManagePlacementOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading matches...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Job Matches</h1>
          <p className="text-muted-foreground mt-2">Successful job placements and candidate matches</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isNewPlacementOpen} onOpenChange={setIsNewPlacementOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pink-500 hover:bg-pink-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Placement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Placement</DialogTitle>
                <DialogDescription>
                  Create a new job placement record using existing candidates and jobs.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreatePlacement} className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="candidateId">Candidate *</Label>
                    <Select value={placementData.candidateId} onValueChange={(value) => handleInputChange("candidateId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={talentPoolLoading ? "Loading talent pool..." : "Select from talent pool"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCandidates.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No available candidates in talent pool
                          </div>
                        ) : (
                          availableCandidates.map((candidate) => (
                            <SelectItem key={candidate.candidate.candidateId} value={candidate.candidate.candidateId.toString()}>
                              <div className="flex flex-col">
                                <span>{candidate.candidate.firstName} {candidate.candidate.lastName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {candidate.candidate.email} • {candidate.status.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only showing talent pool candidates (advanced stage + manual entries)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jobId">Job *</Label>
                    <Select value={placementData.jobId} onValueChange={(value) => handleInputChange("jobId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={jobsLoading ? "Loading jobs..." : "Select a job"} />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.adId} value={job.adId.toString()}>
                            <div className="flex flex-col">
                              <span>{job.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {job.company.name} - {job.location.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={placementData.startDate}
                      onChange={(e) => handleInputChange("startDate", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={placementData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for permanent positions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="salaryRate">Salary Rate</Label>
                    <Input
                      id="salaryRate"
                      type="number"
                      placeholder="e.g. 120000"
                      value={placementData.salaryRate}
                      onChange={(e) => handleInputChange("salaryRate", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="salaryCurrency">Currency</Label>
                    <Select value={placementData.salaryCurrency} onValueChange={(value) => handleInputChange("salaryCurrency", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="salaryRatePer">Rate Per</Label>
                    <Select value={placementData.salaryRatePer} onValueChange={(value) => handleInputChange("salaryRatePer", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hour">Hour</SelectItem>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Week">Week</SelectItem>
                        <SelectItem value="Month">Month</SelectItem>
                        <SelectItem value="Year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="workTypeId">Work Type</Label>
                    <Select value={placementData.workTypeId} onValueChange={(value) => handleInputChange("workTypeId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Full-time Permanent</SelectItem>
                        <SelectItem value="2">Full-time Contract</SelectItem>
                        <SelectItem value="3">Part-time</SelectItem>
                        <SelectItem value="4">Casual/Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="statusId">Status</Label>
                    <Select value={placementData.statusId} onValueChange={(value) => handleInputChange("statusId", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Active</SelectItem>
                        <SelectItem value="2">Pending Start</SelectItem>
                        <SelectItem value="3">Completed</SelectItem>
                        <SelectItem value="4">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes about this placement..."
                    value={placementData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <Button type="submit" className="flex-1">
                    Create Placement
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewPlacementOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isManualPlacementOpen} onOpenChange={setIsManualPlacementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-pink-500 hover:bg-pink-600 text-white border-pink-500">
                <Plus className="h-4 w-4 mr-2" />
                Manual Placement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manual Placement Creation</DialogTitle>
                <DialogDescription>
                  Create a new placement by adding candidates, jobs, or directly creating the placement record.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="placement">Create Placement</TabsTrigger>
                  <TabsTrigger value="candidate">Add Candidate</TabsTrigger>
                  <TabsTrigger value="job">Add Job</TabsTrigger>
                </TabsList>
                
                <TabsContent value="placement" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Candidate *</Label>
                      <Select value={placementData.candidateId} onValueChange={(value) => handleInputChange("candidateId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a candidate" />
                        </SelectTrigger>
                        <SelectContent>
                          {candidates.map((candidate) => (
                            <SelectItem key={candidate.candidateId} value={candidate.candidateId.toString()}>
                              <div className="flex flex-col">
                                <span>{candidate.firstName} {candidate.lastName}</span>
                                <span className="text-xs text-muted-foreground">{candidate.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Job *</Label>
                      <Select value={placementData.jobId} onValueChange={(value) => handleInputChange("jobId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.adId} value={job.adId.toString()}>
                              <div className="flex flex-col">
                                <span>{job.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {job.company.name} - {job.location.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={placementData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={placementData.endDate}
                        onChange={(e) => handleInputChange("endDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Salary Rate</Label>
                      <Input
                        type="number"
                        placeholder="120000"
                        value={placementData.salaryRate}
                        onChange={(e) => handleInputChange("salaryRate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={placementData.salaryCurrency} onValueChange={(value) => handleInputChange("salaryCurrency", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rate Per</Label>
                      <Select value={placementData.salaryRatePer} onValueChange={(value) => handleInputChange("salaryRatePer", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hour">Hour</SelectItem>
                          <SelectItem value="Month">Month</SelectItem>
                          <SelectItem value="Year">Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="candidate" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        placeholder="John"
                        value={newCandidateData.firstName}
                        onChange={(e) => handleCandidateInputChange("firstName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        placeholder="Doe"
                        value={newCandidateData.lastName}
                        onChange={(e) => handleCandidateInputChange("lastName", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        placeholder="john.doe@email.com"
                        value={newCandidateData.email}
                        onChange={(e) => handleCandidateInputChange("email", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        value={newCandidateData.phone}
                        onChange={(e) => handleCandidateInputChange("phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Current Role</Label>
                      <Input
                        placeholder="Senior Developer"
                        value={newCandidateData.currentRole}
                        onChange={(e) => handleCandidateInputChange("currentRole", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Company</Label>
                      <Input
                        placeholder="Tech Corp"
                        value={newCandidateData.currentCompany}
                        onChange={(e) => handleCandidateInputChange("currentCompany", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Skills</Label>
                      <Input
                        placeholder="React, TypeScript, Node.js"
                        value={newCandidateData.skills}
                        onChange={(e) => handleCandidateInputChange("skills", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Experience (Years)</Label>
                      <Input
                        type="number"
                        placeholder="5"
                        value={newCandidateData.experienceYears}
                        onChange={(e) => handleCandidateInputChange("experienceYears", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="San Francisco, CA"
                      value={newCandidateData.location}
                      onChange={(e) => handleCandidateInputChange("location", e.target.value)}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="job" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input
                        placeholder="Senior Frontend Developer"
                        value={newJobData.title}
                        onChange={(e) => handleJobInputChange("title", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input
                        placeholder="Tech Corp"
                        value={newJobData.company}
                        onChange={(e) => handleJobInputChange("company", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="San Francisco, CA"
                        value={newJobData.location}
                        onChange={(e) => handleJobInputChange("location", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Work Type</Label>
                      <Select value={newJobData.workType} onValueChange={(value) => handleJobInputChange("workType", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Freelance">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Salary Low</Label>
                      <Input
                        type="number"
                        placeholder="100000"
                        value={newJobData.salaryLow}
                        onChange={(e) => handleJobInputChange("salaryLow", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Salary High</Label>
                      <Input
                        type="number"
                        placeholder="150000"
                        value={newJobData.salaryHigh}
                        onChange={(e) => handleJobInputChange("salaryHigh", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={newJobData.currency} onValueChange={(value) => handleJobInputChange("currency", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Job description and responsibilities..."
                      value={newJobData.description}
                      onChange={(e) => handleJobInputChange("description", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Requirements</Label>
                    <Textarea
                      placeholder="Required skills and qualifications..."
                      value={newJobData.requirements}
                      onChange={(e) => handleJobInputChange("requirements", e.target.value)}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-4 pt-6">
                <Button onClick={handleManualPlacement} className="flex-1">
                  {activeTab === "candidate" ? "Add Candidate" : 
                   activeTab === "job" ? "Add Job" : 
                   "Create Placement"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsManualPlacementOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} - Showing sample placements for demonstration.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search placements by candidate name, job title, or company..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {placements.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No job placements found matching your search.</p>
          </div>
        ) : (
          placements.map((placement) => (
            <Card key={placement.placementId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${placement.candidate.firstName}${placement.candidate.lastName}`} />
                    <AvatarFallback className="text-lg">
                      {`${placement.candidate.firstName[0]}${placement.candidate.lastName[0]}`}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <CardTitle className="text-xl mb-1">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Successful Match
                          </span>
                        </CardTitle>
                        <CardDescription className="text-base">
                          Placement ID: {placement.placementId}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={getStatusColor(placement.status.name)}>
                          {placement.status.name}
                        </Badge>
                        {placement.workType && (
                          <Badge variant="outline" className={getWorkTypeColor(placement.workType.name)}>
                            {placement.workType.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Match Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                      {/* Candidate Information */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Candidate</span>
                        </div>
                        <div className="pl-6 space-y-2">
                          <h3 className="font-semibold text-lg">
                            {placement.candidate.salutation ? `${placement.candidate.salutation} ` : ''}
                            {placement.candidate.firstName} {placement.candidate.lastName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {placement.candidate.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {placement.candidate.phone || placement.candidate.mobile}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {placement.candidate.address ? 
                                `${placement.candidate.address.city}, ${placement.candidate.address.state}` : 
                                'Location not specified'
                              }
                            </span>
                            {placement.candidate.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {placement.candidate.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Job Information */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Position</span>
                        </div>
                        <div className="pl-6 space-y-2">
                          <h3 className="font-semibold text-lg">{placement.job.jobTitle}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {placement.job.company?.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {placement.job.location?.name}
                            </span>
                          </div>
                          {placement.job.contact && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Contact: </span>
                              {placement.job.contact.firstName} {placement.job.contact.lastName}
                              {placement.job.contact.position && ` (${placement.job.contact.position})`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Placement Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="font-medium flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Salary
                        </span>
                        <p className="text-muted-foreground">
                          {formatSalary(placement.salary)}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Start Date
                        </span>
                        <p className="text-muted-foreground">
                          {placement.startDate ? new Date(placement.startDate).toLocaleDateString() : 'TBD'}
                        </p>
                        {placement.startDate && (
                          <p className="text-xs text-muted-foreground">
                            {getDaysUntilStart(placement.startDate)}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <span className="font-medium flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Duration
                        </span>
                        <p className="text-muted-foreground">
                          {placement.endDate ? 
                            `Until ${new Date(placement.endDate).toLocaleDateString()}` : 
                            'Permanent'
                          }
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="font-medium">Placed</span>
                        <p className="text-muted-foreground">
                          {placement.createdAt ? new Date(placement.createdAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Placement ID: {placement.placementId}</span>
                    {placement.updatedAt && (
                      <span>Last updated: {new Date(placement.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                   <div className="flex gap-2">
                     <Button 
                       variant="outline" 
                       size="sm"
                       className="bg-pink-500 hover:bg-pink-600 text-white border-pink-500"
                       onClick={() => handleViewDetails(placement)}
                     >
                       <Eye className="h-4 w-4 mr-1" />
                       View Details
                     </Button>
                     <Button 
                       size="sm"
                       className="bg-pink-500 hover:bg-pink-600 text-white"
                       onClick={() => handleManagePlacement(placement)}
                     >
                       <Settings className="h-4 w-4 mr-1" />
                       Manage Placement
                     </Button>
                   </div>

                   {/* Placement Details Modal */}
                   <Dialog open={isPlacementDetailsOpen} onOpenChange={setIsPlacementDetailsOpen}>
                     <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                       <DialogHeader>
                         <DialogTitle>Placement Details</DialogTitle>
                         <DialogDescription>
                           Detailed information about this placement from JobAdder
                         </DialogDescription>
                       </DialogHeader>
                       
                       {placementLoading ? (
                         <div className="flex justify-center items-center py-8">
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                         </div>
                       ) : placementDetails ? (
                         <div className="space-y-6">
                           {/* Candidate Details */}
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             <Card>
                               <CardHeader>
                                 <CardTitle className="flex items-center gap-2">
                                   <User className="h-5 w-5" />
                                   Candidate Information
                                 </CardTitle>
                               </CardHeader>
                               <CardContent className="space-y-4">
                                 <div>
                                   <h3 className="font-semibold text-lg">
                                     {placementDetails.candidate.firstName} {placementDetails.candidate.lastName}
                                   </h3>
                                   <div className="space-y-2 text-sm text-muted-foreground mt-2">
                                     <p className="flex items-center gap-2">
                                       <Mail className="h-4 w-4" />
                                       {placementDetails.candidate.email}
                                     </p>
                                     {placementDetails.candidate.phone && (
                                       <p className="flex items-center gap-2">
                                         <Phone className="h-4 w-4" />
                                         {placementDetails.candidate.phone}
                                       </p>
                                     )}
                                     {placementDetails.candidate.address && (
                                       <p className="flex items-center gap-2">
                                         <MapPin className="h-4 w-4" />
                                         {[
                                           placementDetails.candidate.address.street?.[0],
                                           placementDetails.candidate.address.city,
                                           placementDetails.candidate.address.state,
                                           placementDetails.candidate.address.postalCode,
                                           placementDetails.candidate.address.country
                                         ].filter(Boolean).join(', ')}
                                       </p>
                                     )}
                                   </div>
                                 </div>
                                 
                                 {placementDetails.candidate.status && (
                                   <div>
                                     <Label className="text-sm font-medium">Status</Label>
                                     <Badge className={`ml-2 ${placementDetails.candidate.status.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                       {placementDetails.candidate.status.name}
                                     </Badge>
                                   </div>
                                 )}
                                 
                                 {placementDetails.candidate.skills && placementDetails.candidate.skills.length > 0 && (
                                   <div>
                                     <Label className="text-sm font-medium">Skills</Label>
                                     <div className="flex flex-wrap gap-1 mt-1">
                                       {placementDetails.candidate.skills.map((skill, index) => (
                                         <Badge key={index} variant="outline" className="text-xs">
                                           {skill}
                                         </Badge>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                                 
                                 {placementDetails.candidate.employment?.current?.[0] && (
                                   <div>
                                     <Label className="text-sm font-medium">Current Employment</Label>
                                     <p className="text-sm text-muted-foreground">
                                       {placementDetails.candidate.employment.current[0].position} at {placementDetails.candidate.employment.current[0].employer}
                                     </p>
                                   </div>
                                 )}
                               </CardContent>
                             </Card>

                             {/* Job Details */}
                             <Card>
                               <CardHeader>
                                 <CardTitle className="flex items-center gap-2">
                                   <Briefcase className="h-5 w-5" />
                                   Job Information
                                 </CardTitle>
                               </CardHeader>
                               <CardContent className="space-y-4">
                                 <div>
                                   <h3 className="font-semibold text-lg">{placementDetails.job.jobTitle}</h3>
                                   <div className="space-y-2 text-sm text-muted-foreground mt-2">
                                     {placementDetails.job.company && (
                                       <p className="flex items-center gap-2">
                                         <Building className="h-4 w-4" />
                                         {placementDetails.job.company.name}
                                       </p>
                                     )}
                                     {placementDetails.job.location && (
                                       <p className="flex items-center gap-2">
                                         <MapPin className="h-4 w-4" />
                                         {placementDetails.job.location.name}
                                       </p>
                                     )}
                                   </div>
                                 </div>
                                 
                                 {placementDetails.job.contact && (
                                   <div>
                                     <Label className="text-sm font-medium">Contact Person</Label>
                                     <p className="text-sm text-muted-foreground">
                                       {placementDetails.job.contact.firstName} {placementDetails.job.contact.lastName}
                                       {placementDetails.job.contact.position && ` - ${placementDetails.job.contact.position}`}
                                     </p>
                                     <p className="text-sm text-muted-foreground">{placementDetails.job.contact.email}</p>
                                   </div>
                                 )}
                               </CardContent>
                             </Card>
                           </div>

                           {/* Placement Details */}
                           <Card>
                             <CardHeader>
                               <CardTitle className="flex items-center gap-2">
                                 <CheckCircle2 className="h-5 w-5" />
                                 Placement Details
                               </CardTitle>
                             </CardHeader>
                             <CardContent>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <div>
                                   <Label className="text-sm font-medium">Status</Label>
                                   <Badge className={`ml-2 ${getStatusColor(placementDetails.status.name)}`}>
                                     {placementDetails.status.name}
                                   </Badge>
                                 </div>
                                 
                                 {placementDetails.workType && (
                                   <div>
                                     <Label className="text-sm font-medium">Work Type</Label>
                                     <Badge variant="outline" className={`ml-2 ${getWorkTypeColor(placementDetails.workType.name)}`}>
                                       {placementDetails.workType.name}
                                     </Badge>
                                   </div>
                                 )}
                                 
                                 {placementDetails.salary && (
                                   <div>
                                     <Label className="text-sm font-medium">Salary</Label>
                                     <p className="text-sm text-muted-foreground">
                                       {formatSalary(placementDetails.salary)}
                                     </p>
                                   </div>
                                 )}
                               </div>
                               
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                 <div>
                                   <Label className="text-sm font-medium">Start Date</Label>
                                   <p className="text-sm text-muted-foreground">
                                     {placementDetails.startDate ? new Date(placementDetails.startDate).toLocaleDateString() : 'Not specified'}
                                   </p>
                                 </div>
                                 
                                 <div>
                                   <Label className="text-sm font-medium">End Date</Label>
                                   <p className="text-sm text-muted-foreground">
                                     {placementDetails.endDate ? new Date(placementDetails.endDate).toLocaleDateString() : 'Permanent'}
                                   </p>
                                 </div>
                               </div>
                               
                               {placementDetails.notes && (
                                 <div className="mt-4">
                                   <Label className="text-sm font-medium">Notes</Label>
                                   <p className="text-sm text-muted-foreground mt-1">{placementDetails.notes}</p>
                                 </div>
                               )}
                               
                               {placementDetails.owner && (
                                 <div className="mt-4">
                                   <Label className="text-sm font-medium">Placement Owner</Label>
                                   <p className="text-sm text-muted-foreground">
                                     {placementDetails.owner.firstName} {placementDetails.owner.lastName} ({placementDetails.owner.email})
                                   </p>
                                 </div>
                               )}
                               
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-xs text-muted-foreground">
                                 <div>
                                   <Label className="text-sm font-medium">Created</Label>
                                   <p>{placementDetails.createdAt ? new Date(placementDetails.createdAt).toLocaleString() : 'Unknown'}</p>
                                 </div>
                                 <div>
                                   <Label className="text-sm font-medium">Last Updated</Label>
                                   <p>{placementDetails.updatedAt ? new Date(placementDetails.updatedAt).toLocaleString() : 'Unknown'}</p>
                                 </div>
                               </div>
                             </CardContent>
                           </Card>
                         </div>
                       ) : (
                         <div className="text-center py-8">
                           <p className="text-muted-foreground">No placement details available</p>
                         </div>
                       )}
                     </DialogContent>
                   </Dialog>

                   {/* Manage Placement Modal */}
                   <Dialog open={isManagePlacementOpen} onOpenChange={setIsManagePlacementOpen}>
                     <DialogContent className="max-w-2xl">
                       <DialogHeader>
                         <DialogTitle>Manage Placement</DialogTitle>
                         <DialogDescription>
                           Update placement status and add notes (synced to JobAdder)
                         </DialogDescription>
                       </DialogHeader>
                       
                       {selectedPlacement && (
                         <div className="space-y-6">
                           <div className="p-4 bg-muted rounded-lg">
                             <h3 className="font-semibold">
                               {selectedPlacement.candidate.firstName} {selectedPlacement.candidate.lastName}
                             </h3>
                             <p className="text-sm text-muted-foreground">
                               {selectedPlacement.job.jobTitle} at {selectedPlacement.job.company?.name}
                             </p>
                           </div>
                           
                           <div className="space-y-4">
                             <div>
                               <Label htmlFor="status">Update Status</Label>
                               <Select defaultValue={selectedPlacement.status.statusId.toString()}>
                                 <SelectTrigger>
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="1">Active</SelectItem>
                                   <SelectItem value="2">Pending Start</SelectItem>
                                   <SelectItem value="3">Completed</SelectItem>
                                   <SelectItem value="4">Cancelled</SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>
                             
                             <div>
                               <Label htmlFor="notes">Add Notes</Label>
                               <Textarea
                                 id="notes"
                                 placeholder="Add notes about this placement..."
                                 rows={4}
                               />
                             </div>
                           </div>
                           
                           <div className="flex gap-4">
                             <Button 
                               className="bg-pink-500 hover:bg-pink-600 text-white flex-1"
                               onClick={async () => {
                                 // Update placement status via JobAdder API
                                 try {
                                   await updatePlacementStatus(selectedPlacement.placementId, 1, "Status updated");
                                   toast({
                                     title: "Placement Updated",
                                     description: "Placement status has been updated in JobAdder."
                                   });
                                   setIsManagePlacementOpen(false);
                                   refetch();
                                 } catch (error) {
                                   toast({
                                     title: "Error",
                                     description: "Failed to update placement status.",
                                     variant: "destructive"
                                   });
                                 }
                               }}
                             >
                               Update Placement
                             </Button>
                             <Button 
                               variant="outline" 
                               onClick={() => setIsManagePlacementOpen(false)}
                               className="flex-1"
                             >
                               Cancel
                             </Button>
                           </div>
                         </div>
                       )}
                     </DialogContent>
                   </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Matches;