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
import { useJobApplications, type JobApplicationCandidate } from "@/hooks/useJobApplications";
import { useToast } from "@/hooks/use-toast";

const Applications = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdateStageOpen, setIsUpdateStageOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplicationCandidate | null>(null);
  const [stageUpdateData, setStageUpdateData] = useState({
    statusId: "",
    stageName: "",
    notes: "",
    createPlacement: false
  });
  
  const { applications, loading, error, useMockData, refetch, updateApplicationStage } = useJobApplications();
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    refetch(value);
  };

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
        // Create placement when moved to "placed" stage
        toast({
          title: "Application Moved to Placed!",
          description: `${selectedApplication.candidate.firstName} ${selectedApplication.candidate.lastName} has been placed. A placement record has been created.`,
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

  const applicationStages = [
    { id: "1", name: "Application Review", description: "Initial review of application" },
    { id: "2", name: "Phone Interview", description: "Phone screening with candidate" },
    { id: "3", name: "Technical Interview", description: "Technical assessment and interview" },
    { id: "4", name: "Final Interview", description: "Final interview with hiring manager" },
    { id: "5", name: "Offer Extended", description: "Job offer has been extended" },
    { id: "6", name: "Placed", description: "Candidate has accepted and placement created" },
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
          <h1 className="text-3xl font-bold">Job Applications</h1>
          <p className="text-muted-foreground mt-2">Manage and track all job applications through their stages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Applications</Button>
          <Button variant="outline">Bulk Actions</Button>
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

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications by candidate name, job title, or company..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No job applications found matching your search.</p>
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
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateStage(application)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update Stage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
    </div>
  );
};

export default Applications;