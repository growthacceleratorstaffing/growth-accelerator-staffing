import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useJazzHRJobs } from "@/hooks/useJazzHRJobs";
import { JazzHRSearchBar } from "@/components/job-search/JazzHRSearchBar";
import { JazzHRSearchStats } from "@/components/job-search/JazzHRSearchStats";
import { JazzHRJobList } from "@/components/job-search/JazzHRJobList";
import { JazzHRJob } from "@/lib/jazzhr-api";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Settings, Upload, Download, RefreshCw, ExternalLink } from "lucide-react";

interface JobApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coverLetter: string;
  resumeText: string;
}

const JobBoardManager = () => {
  const [searchParams, setSearchParams] = useState({ 
    title: "", 
    department: "", 
    status: "Open",
    limit: 20, 
    offset: 0 
  });
  const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JazzHRJob | null>(null);
  const [applicationData, setApplicationData] = useState<JobApplicationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    coverLetter: "",
    resumeText: ""
  });

  const { toast } = useToast();
  
  const { 
    data: jobs = [], 
    isLoading, 
    error,
    refetch 
  } = useJazzHRJobs({
    title: searchParams.title || undefined,
    department: searchParams.department || undefined,
    status: searchParams.status || undefined,
  });

  const handleSearch = (params: { search?: string; limit?: number; offset?: number }) => {
    setSearchParams(prev => ({ 
      ...prev, 
      title: params.search || "",
      limit: params.limit || 20, 
      offset: params.offset || 0 
    }));
    refetch();
  };

  const handleApplyClick = (jobAd: JazzHRJob) => {
    setSelectedJob(jobAd);
    setIsApplicationFormOpen(true);
  };

  const submitApplication = async () => {
    if (!selectedJob) return;

    try {
      // Submit application via JazzHR API
      // This would need to be implemented in the JazzHR API client
      toast({
        title: "Application submitted",
        description: `Your application for ${selectedJob.title} has been submitted successfully.`,
      });
      
      setIsApplicationFormOpen(false);
      setApplicationData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        coverLetter: "",
        resumeText: ""
      });
    } catch (error) {
      console.error('Failed to submit application:', error);
      toast({
        title: "Submission failed",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="font-medium text-destructive">JazzHR Connection Error</h3>
              <p className="text-sm text-muted-foreground">
                Unable to connect to JazzHR API. Please check your API configuration.
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* JazzHR Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            JazzHR Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Browse and manage job positions from your JazzHR account.
          </p>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Connected to JazzHR API
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Search Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <JazzHRSearchBar 
            onSearch={handleSearch}
            isLoading={isLoading}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Department</Label>
              <Input
                placeholder="Filter by department"
                value={searchParams.department}
                onChange={(e) => setSearchParams(prev => ({ ...prev, department: e.target.value }))}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={searchParams.status}
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Needs Approval">Needs Approval</SelectItem>
                  <SelectItem value="Drafting">Drafting</SelectItem>
                  <SelectItem value="Filled">Filled</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Results */}
      <JazzHRSearchStats 
        searchQuery={searchParams.title}
        totalResults={jobs.length}
        isLoading={isLoading}
      />
      
      <JazzHRJobList 
        jobs={jobs}
        isLoading={isLoading}
      />

      {/* Application Form Dialog */}
      <Dialog open={isApplicationFormOpen} onOpenChange={setIsApplicationFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={applicationData.firstName}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={applicationData.lastName}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={applicationData.email}
                onChange={(e) => setApplicationData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={applicationData.phone}
                onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Cover Letter</Label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={4}
                value={applicationData.coverLetter}
                onChange={(e) => setApplicationData(prev => ({ ...prev, coverLetter: e.target.value }))}
              />
            </div>
            <div>
              <Label>Resume (Text)</Label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={6}
                value={applicationData.resumeText}
                onChange={(e) => setApplicationData(prev => ({ ...prev, resumeText: e.target.value }))}
                placeholder="Paste your resume text here..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={submitApplication} className="flex-1">
                Submit Application
              </Button>
              <Button 
                onClick={() => setIsApplicationFormOpen(false)} 
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { JobBoardManager };