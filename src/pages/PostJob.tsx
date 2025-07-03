import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const PostJob = () => {
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
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
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
    
    // Navigate back to jobs page
    navigate("/jobs");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Post a New Job</h1>
        <p className="text-muted-foreground mt-2">Fill out the details to create your job posting</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>
            Provide information about the position you're looking to fill
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category ID</Label>
                <Input
                  id="categoryId"
                  placeholder="e.g. 1"
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange("categoryId", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subCategoryId">Sub Category ID</Label>
                <Input
                  id="subCategoryId"
                  placeholder="e.g. 11"
                  value={formData.subCategoryId}
                  onChange={(e) => handleInputChange("subCategoryId", e.target.value)}
                />
              </div>
            </div>

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

            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1">
                Post Job
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/jobs")}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostJob;