import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit,
  LayoutGrid,
  List
} from "lucide-react";
import { Button as PaginationButton } from "@/components/ui/button";
import { useJazzHRApplicants } from "@/hooks/useJazzHRApplicants";
import { useCandidateDetails } from "@/hooks/useCandidateDetails";
import { useCandidates } from "@/hooks/useCandidates";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CandidateKanbanBoard } from "@/components/candidates/CandidateKanbanBoard";

const Applications = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [applicantsPage, setApplicantsPage] = useState(1);
  const [isUpdateStageOpen, setIsUpdateStageOpen] = useState(false);
  const [isCandidateDetailsOpen, setIsCandidateDetailsOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
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
  
  const { data: jazzhrApplicants, isLoading, error } = useJazzHRApplicants();
  const { candidates: localCandidates, loading: localLoading } = useCandidates();
  const { candidateDetails, loading: candidateLoading, fetchCandidateDetails, clearCandidateDetails } = useCandidateDetails();
  const { toast } = useToast();

  // Combine JazzHR applicants and local candidates
  const [allCandidates, setAllCandidates] = useState<any[]>([]);

  useEffect(() => {
    // Process JazzHR applicants - these are the real candidates from JazzHR API
    const jazzhrCandidates = jazzhrApplicants ? (Array.isArray(jazzhrApplicants) ? jazzhrApplicants : [jazzhrApplicants]) : [];
    
    // Transform JazzHR candidates to ensure proper structure
    const transformedJazzHRCandidates = jazzhrCandidates.map(candidate => ({
      id: candidate.id, // Use JazzHR's unique ID
      first_name: candidate.first_name || '',
      last_name: candidate.last_name || '',
      email: candidate.email || '',
      phone: candidate.prospect_phone || candidate.phone || '',
      apply_date: candidate.apply_date,
      job: {
        id: candidate.job_id || 'unknown',
        title: candidate.job_title || 'N/A'
      },
      source: 'JazzHR',
      stage: candidate.stage || 'new' // Default to 'new' stage
    }));
    
    // Transform local candidates to match the structure with unique IDs
    const transformedLocalCandidates = (localCandidates || []).map(candidate => ({
      id: `local_${candidate.candidateId}`, // Prefix to avoid ID conflicts
      first_name: candidate.firstName || '',
      last_name: candidate.lastName || '',
      email: candidate.email,
      phone: candidate.phone,
      apply_date: candidate.created,
      job: {
        id: 'local',
        title: 'Added directly to talent pool'
      },
      source: 'Local',
      stage: candidate.stage || 'new' // Default to 'new' stage
    }));

    // Combine JazzHR and local candidates
    setAllCandidates([...transformedJazzHRCandidates, ...transformedLocalCandidates]);
  }, [jazzhrApplicants, localCandidates]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Reset pagination when searching
    setApplicantsPage(1);
  };

  // Filter candidates based on search term
  const filteredApplicants = allCandidates.filter(applicant =>
    applicant.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    applicant.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    applicant.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination helpers
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const getTotalPages = (total: number) => Math.ceil(total / ITEMS_PER_PAGE);

  const paginatedApplicants = getPaginatedData(filteredApplicants, applicantsPage);

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

  const handleUpdateStage = (application: any) => {
    setSelectedApplication(application);
    setStageUpdateData({
      statusId: "1",
      stageName: "Application Review",
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
      // Find the stage ID that matches the stage name
      const stageMapping: Record<string, string> = {
        "NEW": "new",
        "INTERVIEW": "interview", 
        "CLIENT INTRODUCTION": "client_introduction",
        "HIRED": "hired",
        "DISQUALIFIED": "disqualified"
      };

      const newStageId = stageMapping[stageUpdateData.stageName] || stageUpdateData.stageName.toLowerCase().replace(/\s+/g, '_');

      // Update the candidate stage in the local state
      setAllCandidates(prev => 
        prev.map(candidate => 
          candidate.id === selectedApplication.id 
            ? { ...candidate, stage: newStageId }
            : candidate
        )
      );

      if (stageUpdateData.createPlacement || stageUpdateData.stageName.toLowerCase() === "hired") {
        toast({
          title: "Candidate Placed!",
          description: `${selectedApplication.first_name} ${selectedApplication.last_name} has been successfully placed.`,
        });
      } else {
        toast({
          title: "Stage Updated!",
          description: `${selectedApplication.first_name} ${selectedApplication.last_name} moved to "${stageUpdateData.stageName}".`,
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
      
      // Refresh local candidates data by triggering a re-fetch
      window.location.reload(); // Simple but effective way to refresh the data
      
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast({
        title: "Error",
        description: "Failed to add candidate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = async (application: any) => {
    setSelectedApplication(application);
    setIsCandidateDetailsOpen(true);
    
    try {
      await fetchCandidateDetails(application.id);
    } catch (error) {
      console.error('Failed to fetch candidate details:', error);
    }
  };

  // Updated stages to match your attachment
  const applicationStages = [
    { id: "new", name: "NEW", description: "Initial application submitted" },
    { id: "interview", name: "INTERVIEW", description: "Interview stage" },
    { id: "client_introduction", name: "CLIENT INTRODUCTION", description: "Introduction to client" },
    { id: "hired", name: "HIRED", description: "Successfully hired" },
    { id: "disqualified", name: "DISQUALIFIED", description: "Application disqualified" },
  ];

  // Handle stage changes from drag and drop
  const handleStageChange = async (candidateId: string, newStage: string) => {
    console.log(`Attempting to move candidate ${candidateId} to stage ${newStage}`);
    
    try {
      // Update ONLY the specific candidate with the matching ID
      setAllCandidates(prev => {
        const updatedCandidates = prev.map(candidate => {
          if (candidate.id === candidateId) {
            console.log(`Updating candidate ${candidate.first_name} ${candidate.last_name} (ID: ${candidate.id}) to stage ${newStage}`);
            return { ...candidate, stage: newStage };
          }
          return candidate;
        });
        
        // Log to verify only one candidate was updated
        const updatedCount = updatedCandidates.filter(c => c.stage === newStage && c.id === candidateId).length;
        console.log(`Updated ${updatedCount} candidate(s) to stage ${newStage}`);
        
        return updatedCandidates;
      });

      // Log success
      console.log(`Successfully updated candidate ${candidateId} to stage ${newStage}`);
    } catch (error) {
      console.error('Failed to update candidate stage:', error);
      toast({
        title: "Error",
        description: "Failed to update candidate stage.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
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

      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load candidates data. Please check your connection.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Candidates ({filteredApplicants.length})</h2>
        </div>

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

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban Board
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            {filteredApplicants.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No candidates found matching your search.</p>
              </div>
            ) : (
              <CandidateKanbanBoard
                candidates={filteredApplicants}
                onStageChange={handleStageChange}
                onViewDetails={handleViewDetails}
                onUpdateStage={handleUpdateStage}
              />
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="grid gap-6">
              {paginatedApplicants.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No candidates found matching your search.</p>
                </div>
              ) : (
                <>
                  {paginatedApplicants.map((applicant) => (
                    <Card key={applicant.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${applicant.first_name}${applicant.last_name}`} />
                            <AvatarFallback className="text-lg">
                              {`${applicant.first_name?.[0] || ''}${applicant.last_name?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <CardTitle className="text-xl mb-1">
                                  <span className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    {applicant.first_name} {applicant.last_name}
                                  </span>
                                </CardTitle>
                                <CardDescription className="text-base">
                                  Applied for: <span className="font-medium">{applicant.job?.title || 'N/A'}</span>
                                </CardDescription>
                                <CardDescription className="text-sm text-muted-foreground">
                                  Applicant ID: {applicant.id}
                                </CardDescription>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Badge className="bg-blue-100 text-blue-800">
                                  {applicant.stage || 'Applied'}
                                </Badge>
                                <div className="text-sm text-muted-foreground">
                                  {applicant.apply_date && new Date(applicant.apply_date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            {/* Applicant Summary */}
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
                                      {applicant.email || 'N/A'}
                                    </span>
                                    {applicant.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {applicant.phone}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-medium">Source: </span>
                                    <span className="text-muted-foreground">{applicant.source || 'JazzHR'}</span>
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
                                      <Calendar className="h-3 w-3" />
                                      Applied: {applicant.apply_date ? new Date(applicant.apply_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-medium">Job ID: </span>
                                    <span className="text-muted-foreground">{applicant.job?.id || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Separator className="my-4" />

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewDetails(applicant)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View Details
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUpdateStage(applicant)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Update Stage
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </>
              )}
            </div>

            {/* Pagination */}
            {filteredApplicants.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <PaginationButton
                  variant="outline"
                  size="sm"
                  onClick={() => setApplicantsPage(prev => Math.max(1, prev - 1))}
                  disabled={applicantsPage === 1}
                >
                  Previous
                </PaginationButton>
                <span className="text-sm text-muted-foreground px-3">
                  Page {applicantsPage} of {getTotalPages(filteredApplicants.length)}
                </span>
                <PaginationButton
                  variant="outline"
                  size="sm"
                  onClick={() => setApplicantsPage(prev => Math.min(getTotalPages(filteredApplicants.length), prev + 1))}
                  disabled={applicantsPage === getTotalPages(filteredApplicants.length)}
                >
                  Next
                </PaginationButton>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
                `Move ${selectedApplication.first_name} ${selectedApplication.last_name}'s application to a new stage.`
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
                `${selectedApplication.first_name} ${selectedApplication.last_name} - Candidate Details`
              }
            </DialogTitle>
            <DialogDescription>
              Detailed candidate information from JazzHR
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
                  </div>
                </CardContent>
              </Card>
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