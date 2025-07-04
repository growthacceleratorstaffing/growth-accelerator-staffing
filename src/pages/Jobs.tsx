import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapPin, Building, Clock, DollarSign, Search, AlertCircle, Plus, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showPostJobForm, setShowPostJobForm] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: "",
    companyId: "",
    locationId: "",
    workTypeId: "",
    categoryId: "",
    subCategoryId: "",
    salaryRatePer: "Year",
    salaryRateLow: "",
    salaryRateHigh: "",
    salaryCurrency: "USD",
    jobDescription: "",
    skillTags: "",
    source: ""
  });
  
  const { jobs, loading, error, useMockData, refetch } = useJobs();
  const { toast } = useToast();
  const { canPostJobs } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePostJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.jobTitle || !formData.companyId || !formData.locationId || !formData.workTypeId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Here you would typically send the data to your backend
    toast({
      title: "Success!",
      description: "Job posting created successfully.",
    });
    
    // Reset form and close
    setFormData({
      jobTitle: "",
      companyId: "",
      locationId: "",
      workTypeId: "",
      categoryId: "",
      subCategoryId: "",
      salaryRatePer: "Year",
      salaryRateLow: "",
      salaryRateHigh: "",
      salaryCurrency: "USD",
      jobDescription: "",
      skillTags: "",
      source: ""
    });
    setShowPostJobForm(false);
    refetch();
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    refetch(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Job Listings</h1>
          <p className="text-muted-foreground mt-2">Find your next opportunity</p>
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


      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies, or locations..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No jobs found matching your search.</p>
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
                    <span className="text-sm text-muted-foreground">
                      Ref: {job.reference}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/jobs/${job.adId}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                    <Link to={`/jobs/${job.adId}/apply`}>
                      <Button>Apply Now</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Post Job Form - Integrated into page */}
      <div className="mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Post a New Job</CardTitle>
            <CardDescription>
              Fill out the details to create your job posting
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handlePostJobSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g. Senior Frontend Developer"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company ID *</Label>
                  <Input
                    id="companyId"
                    placeholder="e.g. 101"
                    value={formData.companyId}
                    onChange={(e) => handleInputChange("companyId", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="locationId">Location ID *</Label>
                  <Input
                    id="locationId"
                    placeholder="e.g. 201"
                    value={formData.locationId}
                    onChange={(e) => handleInputChange("locationId", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="workTypeId">Work Type ID *</Label>
                  <Select onValueChange={(value) => handleInputChange("workTypeId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Full-time</SelectItem>
                      <SelectItem value="2">Part-time</SelectItem>
                      <SelectItem value="3">Contract</SelectItem>
                      <SelectItem value="4">Freelance</SelectItem>
                      <SelectItem value="5">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="salaryRateLow">Salary Low</Label>
                  <Input
                    id="salaryRateLow"
                    type="number"
                    placeholder="e.g. 120000"
                    value={formData.salaryRateLow}
                    onChange={(e) => handleInputChange("salaryRateLow", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="salaryRateHigh">Salary High</Label>
                  <Input
                    id="salaryRateHigh"
                    type="number"
                    placeholder="e.g. 160000"
                    value={formData.salaryRateHigh}
                    onChange={(e) => handleInputChange("salaryRateHigh", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="salaryRatePer">Rate Per</Label>
                  <Select value={formData.salaryRatePer} onValueChange={(value) => handleInputChange("salaryRatePer", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
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

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description *</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  value={formData.jobDescription}
                  onChange={(e) => handleInputChange("jobDescription", e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="skillTags">Skill Tags</Label>
                  <Input
                    id="skillTags"
                    placeholder="e.g. React, TypeScript, Node.js (comma separated)"
                    value={formData.skillTags}
                    onChange={(e) => handleInputChange("skillTags", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g. Company Website"
                    value={formData.source}
                    onChange={(e) => handleInputChange("source", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="submit" className="flex-1">
                  Post Job
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setFormData({
                      jobTitle: "",
                      companyId: "",
                      locationId: "",
                      workTypeId: "",
                      categoryId: "",
                      subCategoryId: "",
                      salaryRatePer: "Year",
                      salaryRateLow: "",
                      salaryRateHigh: "",
                      salaryCurrency: "USD",
                      jobDescription: "",
                      skillTags: "",
                      source: ""
                    });
                  }}
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Jobs;