import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ArrowRight,
  Eye,
  Edit
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button as PaginationButton } from "@/components/ui/button";
import { useJobApplications, type JobApplicationCandidate } from "@/hooks/useJobApplications";
import { useCandidateDetails } from "@/hooks/useCandidateDetails";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Applications = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [applicantsPage, setApplicantsPage] = useState(1);
  const [talentPoolPage, setTalentPoolPage] = useState(1);
  const [isUpdateStageOpen, setIsUpdateStageOpen] = useState(false);
  const [isCandidateDetailsOpen, setIsCandidateDetailsOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplicationCandidate | null>(null);
  const [stageUpdateData, setStageUpdateData] = useState({
    statusId: "",
    stageName: "",
    notes: "",
    createPlacement: false
  });
  const [newCandidateData, setNewCandidateData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    company: "",
    location: "",
    skills: "",
    notes: ""
  });
  
  const ITEMS_PER_PAGE = 25;
  
  const { applications, jobApplications, talentPool, loading, error, useMockData, refetch, updateApplicationStage } = useJobApplications();
  const { candidateDetails, loading: candidateLoading, fetchCandidateDetails, clearCandidateDetails } = useCandidateDetails();
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Reset pagination when searching
    setApplicantsPage(1);
    setTalentPoolPage(1);
    refetch(value);
  };

  // Pagination helpers
  const getPaginatedData = (data: JobApplicationCandidate[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTotalPages = (total: number) => Math.ceil(total / ITEMS_PER_PAGE);

  const paginatedJobApplications = getPaginatedData(jobApplications, applicantsPage);
  const paginatedTalentPool = getPaginatedData(talentPool, talentPoolPage);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "application review":
      case "submitted": 
        return "bg-blue-100 text-blue-800";
      case "interview scheduled":
      case "phone interview":
        return "bg-yellow-100 text-yellow-800"; 
      case "offer extended":
        return "bg-green-100 text-green-800";
      case "placed":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
      case "declined":
        return "bg-red-100 text-red-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  const getWorkflowProgress = (workflow?: any) => {
    if (!workflow) return "No workflow";
    return `${workflow.stage} (Step ${workflow.step})`;
  };

  const handleUpdateStage = (application: JobApplicationCandidate) => {
    setSelectedApplication(application);
    setStageUpdateData({
      statusId: application.status.statusId.toString(),
      stageName: application.status.name,
      notes: "",
      createPlacement: false
    });
    setIsUpdateStageOpen(true);
  };

  const handleStageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedApplication) return;

    // Basic validation
    if (!stageUpdateData.statusId || !stageUpdateData.stageName) {
      toast({
        title: "Error",
        description: "Please select a valid stage.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the API to update the application stage
      await updateApplicationStage(
        selectedApplication.applicationId, 
        parseInt(stageUpdateData.statusId),
        stageUpdateData.notes
      );
      
            if (stageUpdateData.createPlacement || stageUpdateData.stageName.toLowerCase() === "placed") {
              // Create placement when moved to "placed" stage (step 5)
              toast({
                title: "Candidate Placed!",
                description: `${selectedApplication.candidate.firstName} ${selectedApplication.candidate.lastName} has been successfully placed.`,
              });
            } else {
        toast({
          title: "Stage Updated!",
          description: `Application moved to "${stageUpdateData.stageName}".`,
        });
      }
      
      // Reset form and close modal
      setStageUpdateData({
        statusId: "",
        stageName: "",
        notes: "",
        createPlacement: false
      });
      setSelectedApplication(null);
      setIsUpdateStageOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update application stage.",
        variant: "destructive"
      });
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!newCandidateData.firstName || !newCandidateData.lastName || !newCandidateData.email) {
      toast({
        title: "Error",
        description: "Please fill in the required fields (First Name, Last Name, Email).",
        variant: "destructive"
      });
      return;
    }

    try {
      // Add candidate to local database
      const candidateResponse = await supabase
        .from('candidates')
        .insert({
          name: `${newCandidateData.firstName} ${newCandidateData.lastName}`,
          email: newCandidateData.email,
          phone: newCandidateData.phone,
          current_position: newCandidateData.position,
          company: newCandidateData.company,
          location: newCandidateData.location,
          skills: newCandidateData.skills ? newCandidateData.skills.split(',').map(s => s.trim()) : [],
          source_platform: 'manual'
        })
        .select()
        .single();

      if (candidateResponse.error) {
        throw candidateResponse.error;
      }

      // Sync to JobAdder and Workable via edge function
      const syncResponse = await supabase.functions.invoke('sync-candidate-to-systems', {
        body: {
          candidateId: candidateResponse.data.id,
          candidateData: {
            firstName: newCandidateData.firstName,
            lastName: newCandidateData.lastName,
            email: newCandidateData.email,
            phone: newCandidateData.phone,
            position: newCandidateData.position,
            company: newCandidateData.company,
            location: newCandidateData.location,
            skills: newCandidateData.skills,
            notes: newCandidateData.notes
          }
        }
      });

      toast({
        title: "Candidate Added Successfully!",
        description: `${newCandidateData.firstName} ${newCandidateData.lastName} has been added to the talent pool and synced to JobAdder and Workable.`,
      });

      // Reset form and close dialog
      setNewCandidateData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        company: "",
        location: "",
        skills: "",
        notes: ""
      });
      setIsAddCandidateOpen(false);
      
      // Refresh applications list
      refetch();
      
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast({
        title: "Error",
        description: "Failed to add candidate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = async (application: JobApplicationCandidate) => {
    setSelectedApplication(application);
    setIsCandidateDetailsOpen(true);
    
    try {
      await fetchCandidateDetails(application.candidate.candidateId);
    } catch (error) {
      console.error('Failed to fetch candidate details:', error);
    }
  };

  const applicationStages = [
    { id: "1", name: "Application Review", description: "Initial review of application" },
    { id: "2", name: "Phone Interview", description: "Phone screening with candidate" },
    { id: "3", name: "Technical Interview", description: "Technical assessment and interview" },
    { id: "4", name: "Final Interview", description: "Final interview with hiring manager" },
    { id: "5", name: "Placed", description: "Candidate has been successfully placed" },
    { id: "6", name: "Offer Extended", description: "Job offer has been extended" },
    { id: "7", name: "Rejected", description: "Application rejected" },
    { id: "8", name: "Declined", description: "Candidate declined offer" }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Applications & Talent Pool</h1>
          <p className="text-muted-foreground mt-2">Manage job applications and talent pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAddCandidateOpen(true)}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            <User className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      {error && useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} - Showing sample applications for demonstration.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="talent-pool" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applicants" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            Applicants ({jobApplications.length})
          </TabsTrigger>
          <TabsTrigger value="talent-pool" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            Candidates ({talentPool.length})
          </TabsTrigger>
        </TabsList>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate name, job title, or company..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="applicants" className="space-y-6">
          <div className="grid gap-6">
            {paginatedJobApplications.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No job applications found matching your search.</p>
              </div>
            ) : (
              <>
                {paginatedJobApplications.map((application) => (
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
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <CardTitle className="text-xl mb-1">
                              <span className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                {application.candidate.firstName} {application.candidate.lastName}
                              </span>
                            </CardTitle>
                            <CardDescription className="text-base">
                              Applied for: <span className="font-medium">{application.job.jobTitle}</span>
                            </CardDescription>
                            <CardDescription className="text-sm text-muted-foreground">
                              Application ID: {application.applicationId}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge className={getStatusColor(application.status.name)}>
                              {application.status.name}
                            </Badge>
                            {application.rating && (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{application.rating}/5</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Application Summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                          {/* Candidate Information */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Candidate Details</span>
                            </div>
                            <div className="pl-6 space-y-2">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {application.candidate.email}
                                </span>
                                {application.candidate.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {application.candidate.phone}
                                  </span>
                                )}
                              </div>
                              {application.candidate.address && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {application.candidate.address.city}, {application.candidate.address.state}
                                </div>
                              )}
                              <div className="text-sm">
                                <span className="font-medium">Source: </span>
                                <span className="text-muted-foreground">{application.source || 'Direct Application'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Job Information */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Position Details</span>
                            </div>
                            <div className="pl-6 space-y-2">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {application.job.company?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {application.job.location?.name}
                                </span>
                              </div>
                              {application.jobReference && (
                                <div className="text-sm">
                                  <span className="font-medium">Ref: </span>
                                  <span className="text-muted-foreground">{application.jobReference}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Workflow Progress */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="font-medium flex items-center gap-1">
                              <ArrowRight className="h-4 w-4" />
                              Current Stage
                            </span>
                            <p className="text-muted-foreground">
                              {getWorkflowProgress(application.status.workflow)}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="font-medium flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Applied
                            </span>
                            <p className="text-muted-foreground">
                              {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="font-medium flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Last Updated
                            </span>
                            <p className="text-muted-foreground">
                              {application.updatedAt ? new Date(application.updatedAt).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>ID: {application.applicationId}</span>
                        <span>Source: {application.source || 'Direct'}</span>
                        {application.manual && <Badge variant="outline">Manual Entry</Badge>}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(application)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateStage(application)}
                          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Update Stage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pagination for Job Applications */}
              {getTotalPages(jobApplications.length) > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <PaginationButton
                    variant="outline"
                    onClick={() => setApplicantsPage(prev => Math.max(1, prev - 1))}
                    disabled={applicantsPage === 1}
                  >
                    Previous
                  </PaginationButton>
                  
                  <span className="text-sm text-muted-foreground">
                    Page {applicantsPage} of {getTotalPages(jobApplications.length)}
                    {' '}({jobApplications.length} total)
                  </span>
                  
                  <PaginationButton
                    variant="outline"
                    onClick={() => setApplicantsPage(prev => Math.min(getTotalPages(jobApplications.length), prev + 1))}
                    disabled={applicantsPage === getTotalPages(jobApplications.length)}
                  >
                    Next
                  </PaginationButton>
                </div>
              )}
            </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="talent-pool" className="space-y-6">
          <div className="grid gap-6">
            {paginatedTalentPool.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No candidates found matching your search.</p>
                <p className="text-sm text-muted-foreground mt-2">This section contains candidates who have progressed beyond the initial application stage.</p>
              </div>
            ) : (
              <>
                {paginatedTalentPool.map((candidate) => (
                <Card key={candidate.applicationId} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${candidate.candidate.firstName}${candidate.candidate.lastName}`} />
                        <AvatarFallback className="text-lg">
                          {`${candidate.candidate.firstName[0]}${candidate.candidate.lastName[0]}`}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <CardTitle className="text-xl mb-1">
                              <span className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                {candidate.candidate.firstName} {candidate.candidate.lastName}
                              </span>
                            </CardTitle>
                            <CardDescription className="text-base">
                              Position: <span className="font-medium">{candidate.jobTitle}</span>
                            </CardDescription>
                            <CardDescription className="text-sm text-muted-foreground">
                              Status: Available for opportunities
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge className={getStatusColor(candidate.status.name)}>
                              {candidate.status.name}
                            </Badge>
                            <Badge variant="outline">Candidate</Badge>
                          </div>
                        </div>

                        {/* Candidate Summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                          {/* Contact Information */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Contact Details</span>
                            </div>
                            <div className="pl-6 space-y-2">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {candidate.candidate.email}
                                </span>
                                {candidate.candidate.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {candidate.candidate.phone}
                                  </span>
                                )}
                              </div>
                              {candidate.candidate.address && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {candidate.candidate.address.city}, {candidate.candidate.address.state}
                                </div>
                              )}
                              <div className="text-sm">
                                <span className="font-medium">Source: </span>
                                <span className="text-muted-foreground">{candidate.source || 'Manual Entry'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Current Position */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Current Status</span>
                            </div>
                            <div className="pl-6 space-y-2">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {candidate.job.company?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {candidate.job.location?.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        {/* Status & Timeline */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="font-medium flex items-center gap-1">
                              <ArrowRight className="h-4 w-4" />
                              Current Stage
                            </span>
                            <p className="text-muted-foreground">
                              {getWorkflowProgress(candidate.status.workflow)}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="font-medium flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Added
                            </span>
                            <p className="text-muted-foreground">
                              {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="font-medium flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Last Updated
                            </span>
                            <p className="text-muted-foreground">
                              {candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Ref: {candidate.jobReference}</span>
                        <span>Source: {candidate.source || 'Manual'}</span>
                        <Badge variant="outline">Available</Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(candidate)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateStage(candidate)}
                          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Update Stage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pagination for Talent Pool */}
              {getTotalPages(talentPool.length) > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <PaginationButton
                    variant="outline"
                    onClick={() => setTalentPoolPage(prev => Math.max(1, prev - 1))}
                    disabled={talentPoolPage === 1}
                  >
                    Previous
                  </PaginationButton>
                  
                  <span className="text-sm text-muted-foreground">
                    Page {talentPoolPage} of {getTotalPages(talentPool.length)}
                    {' '}({talentPool.length} total)
                  </span>
                  
                  <PaginationButton
                    variant="outline"
                    onClick={() => setTalentPoolPage(prev => Math.min(getTotalPages(talentPool.length), prev + 1))}
                    disabled={talentPoolPage === getTotalPages(talentPool.length)}
                  >
                    Next
                  </PaginationButton>
                </div>
              )}
            </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Candidate Dialog */}
      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>
              Add a new candidate to the talent pool. This will sync to both JobAdder and Workable.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddCandidate} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newCandidateData.firstName}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newCandidateData.lastName}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newCandidateData.email}
                onChange={(e) => setNewCandidateData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCandidateData.phone}
                onChange={(e) => setNewCandidateData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Current Position</Label>
                <Input
                  id="position"
                  value={newCandidateData.position}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newCandidateData.company}
                  onChange={(e) => setNewCandidateData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Tech Corp"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newCandidateData.location}
                onChange={(e) => setNewCandidateData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="New York, NY"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input
                id="skills"
                value={newCandidateData.skills}
                onChange={(e) => setNewCandidateData(prev => ({ ...prev, skills: e.target.value }))}
                placeholder="JavaScript, React, Node.js, Python"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newCandidateData.notes}
                onChange={(e) => setNewCandidateData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the candidate..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1">
                Add Candidate
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddCandidateOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Stage Dialog */}
      <Dialog open={isUpdateStageOpen} onOpenChange={setIsUpdateStageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Application Stage</DialogTitle>
            <DialogDescription>
              {selectedApplication && 
                `Move ${selectedApplication.candidate.firstName} ${selectedApplication.candidate.lastName}'s application to a new stage.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleStageUpdate} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">New Stage *</Label>
              <Select 
                value={stageUpdateData.stageName} 
                onValueChange={(value) => {
                  const stage = applicationStages.find(s => s.name === value);
                  setStageUpdateData(prev => ({
                    ...prev,
                    statusId: stage?.id || "",
                    stageName: value,
                    createPlacement: value === "Placed"
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {applicationStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.name}>
                      <div className="flex flex-col">
                        <span>{stage.name}</span>
                        <span className="text-xs text-muted-foreground">{stage.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {stageUpdateData.stageName === "Placed" && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Moving this application to "Placed" will automatically create a placement record and move the candidate to the Matches page.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this stage change..."
                value={stageUpdateData.notes}
                onChange={(e) => setStageUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1">
                {stageUpdateData.stageName === "Placed" ? "Create Placement" : "Update Stage"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsUpdateStageOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidate Details Dialog */}
      <Dialog open={isCandidateDetailsOpen} onOpenChange={(open) => {
        setIsCandidateDetailsOpen(open);
        if (!open) {
          clearCandidateDetails();
          setSelectedApplication(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedApplication && 
                `${selectedApplication.candidate.firstName} ${selectedApplication.candidate.lastName} - Candidate Details`
              }
            </DialogTitle>
            <DialogDescription>
              Detailed candidate information from JobAdder
            </DialogDescription>
          </DialogHeader>
          
          {candidateLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : candidateDetails ? (
            <div className="space-y-6 mt-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">{candidateDetails.email}</p>
                    </div>
                    {candidateDetails.phone && (
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="text-sm text-muted-foreground">{candidateDetails.phone}</p>
                      </div>
                    )}
                    {candidateDetails.mobile && (
                      <div>
                        <Label className="text-sm font-medium">Mobile</Label>
                        <p className="text-sm text-muted-foreground">{candidateDetails.mobile}</p>
                      </div>
                    )}
                    {candidateDetails.rating && (
                      <div>
                        <Label className="text-sm font-medium">Rating</Label>
                        <p className="text-sm text-muted-foreground">{candidateDetails.rating}/5</p>
                      </div>
                    )}
                  </div>

                  {candidateDetails.address && (
                    <div>
                      <Label className="text-sm font-medium">Address</Label>
                      <p className="text-sm text-muted-foreground">
                        {candidateDetails.address.street?.join(', ')}<br />
                        {candidateDetails.address.city}, {candidateDetails.address.state} {candidateDetails.address.postalCode}<br />
                        {candidateDetails.address.country}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Employment History */}
              {candidateDetails.employment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {candidateDetails.employment.current && (
                      <div>
                        <Label className="text-sm font-medium">Current Position</Label>
                        <p className="text-sm text-muted-foreground">
                          {candidateDetails.employment.current.position} at {candidateDetails.employment.current.employer}
                          {candidateDetails.employment.current.startDate && 
                            ` (Since ${new Date(candidateDetails.employment.current.startDate).toLocaleDateString()})`
                          }
                        </p>
                      </div>
                    )}

                    {candidateDetails.employment.history && candidateDetails.employment.history.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Employment History</Label>
                        <div className="space-y-2 mt-2">
                          {candidateDetails.employment.history.map((job, index) => (
                            <div key={index} className="border-l-2 border-muted pl-4">
                              <p className="text-sm font-medium">{job.position}</p>
                              <p className="text-sm text-muted-foreground">{job.employer}</p>
                              <p className="text-xs text-muted-foreground">
                                {job.startDate && new Date(job.startDate).toLocaleDateString()} - 
                                {job.endDate ? new Date(job.endDate).toLocaleDateString() : 'Present'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {candidateDetails.education && candidateDetails.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Education</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidateDetails.education.map((edu, index) => (
                        <div key={index} className="border-l-2 border-muted pl-4">
                          <p className="text-sm font-medium">{edu.course}</p>
                          <p className="text-sm text-muted-foreground">{edu.institution}</p>
                          {edu.level && <p className="text-xs text-muted-foreground">{edu.level}</p>}
                          {edu.date && <p className="text-xs text-muted-foreground">Graduated: {edu.date}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {candidateDetails.skills && candidateDetails.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {candidateDetails.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {candidateDetails.notes && candidateDetails.notes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidateDetails.notes.map((note) => (
                        <div key={note.noteId} className="border rounded-lg p-3">
                          <p className="text-sm">{note.text}</p>
                          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                            <span>
                              {note.createdBy && 
                                `${note.createdBy.firstName} ${note.createdBy.lastName}`
                              }
                            </span>
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attachments */}
              {candidateDetails.attachments && candidateDetails.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Attachments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {candidateDetails.attachments.map((attachment) => (
                        <div key={attachment.attachmentId} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="text-sm font-medium">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded: {new Date(attachment.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          {attachment.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No candidate details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Applications;