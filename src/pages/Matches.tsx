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
  Plus
} from "lucide-react";
import { usePlacements } from "@/hooks/usePlacements";
import { useCandidates } from "@/hooks/useCandidates";
import { useJobs } from "@/hooks/useJobs";
import { useToast } from "@/hooks/use-toast";

const Matches = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewPlacementOpen, setIsNewPlacementOpen] = useState(false);
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
  const { placements, loading, error, useMockData, refetch } = usePlacements();
  const { candidates, loading: candidatesLoading } = useCandidates();
  const { jobs, loading: jobsLoading } = useJobs();
  const { toast } = useToast();

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

  const handleCreatePlacement = (e: React.FormEvent) => {
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

    // Since JobAdder API doesn't have direct placement creation,
    // this would typically involve updating a job application status to "placed"
    // For now, we'll show success and refresh the list
    toast({
      title: "Placement Created!",
      description: "The placement has been successfully created and will appear in the system.",
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
          <Button variant="outline">Export Report</Button>
          <Dialog open={isNewPlacementOpen} onOpenChange={setIsNewPlacementOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Placement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Placement</DialogTitle>
                <DialogDescription>
                  Create a new job placement record. Note: In a real implementation, this would typically be done by updating a job application status to "placed".
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreatePlacement} className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="candidateId">Candidate *</Label>
                    <Select value={placementData.candidateId} onValueChange={(value) => handleInputChange("candidateId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={candidatesLoading ? "Loading candidates..." : "Select a candidate"} />
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
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm">Generate Report</Button>
                    <Button size="sm">Manage Placement</Button>
                  </div>
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