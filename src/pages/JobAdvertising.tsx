import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Linkedin, DollarSign, Calendar, Target } from "lucide-react";

const JobAdvertising = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    companyId: "",
    city: "",
    jobFunction: "",
    employmentType: "FULL_TIME",
    workplaceType: "REMOTE",
    duration: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateAdvertisement = async () => {
    if (!formData.jobTitle || !formData.jobDescription || !formData.companyId) {
      toast({
        title: "Missing Information",
        description: "Please fill in job title, description, and company ID",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-job-advertisement', {
        body: {
          jobTitle: formData.jobTitle,
          jobDescription: formData.jobDescription,
          companyId: formData.companyId,
          city: formData.city,
          jobFunction: formData.jobFunction,
          employmentType: formData.employmentType,
          workplaceType: formData.workplaceType,
          duration: parseInt(formData.duration) || 30
        }
      });

      if (error) throw error;

      toast({
        title: "Job Posted",
        description: `Job posted to LinkedIn Jobs! View at: ${data.jobUrl}`
      });

      // Reset form
      setFormData({
        jobTitle: "",
        jobDescription: "",
        companyId: "",
        city: "",
        jobFunction: "",
        employmentType: "FULL_TIME",
        workplaceType: "REMOTE",
        duration: ""
      });

    } catch (error) {
      console.error('Error creating LinkedIn job posting:', error);
      toast({
        title: "Error",
        description: "Failed to create LinkedIn job posting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Linkedin className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Job Advertising</h1>
          <p className="text-muted-foreground">Create and manage LinkedIn job advertisements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advertisement Creation Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
            <CardTitle>Create LinkedIn Job Posting</CardTitle>
            <CardDescription>
              Post a job directly to LinkedIn's job board (linkedin.com/jobs)
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company ID *</Label>
                  <Input
                    id="companyId"
                    placeholder="LinkedIn Company ID"
                    value={formData.companyId}
                    onChange={(e) => handleInputChange("companyId", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description *</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Describe the role, requirements, and benefits..."
                  rows={4}
                  value={formData.jobDescription}
                  onChange={(e) => handleInputChange("jobDescription", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g. San Francisco (leave empty for Remote)"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobFunction">Job Function</Label>
                  <Select onValueChange={(value) => handleInputChange("jobFunction", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job function" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eng">Engineering</SelectItem>
                      <SelectItem value="mkt">Marketing</SelectItem>
                      <SelectItem value="sal">Sales</SelectItem>
                      <SelectItem value="fin">Finance</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="ops">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select onValueChange={(value) => handleInputChange("employmentType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Full-time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full-time</SelectItem>
                      <SelectItem value="PART_TIME">Part-time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
                      <SelectItem value="INTERNSHIP">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workplaceType">Workplace Type</Label>
                  <Select onValueChange={(value) => handleInputChange("workplaceType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Remote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REMOTE">Remote</SelectItem>
                      <SelectItem value="ON_SITE">On-site</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Days)</Label>
                <Select onValueChange={(value) => handleInputChange("duration", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="30 days (default)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCreateAdvertisement}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? "Creating Job Posting..." : "Post Job to LinkedIn"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Job Posting Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                <div>
                  <strong>Professional Visibility:</strong> Jobs appear on LinkedIn's job board
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                <div>
                  <strong>Quality Candidates:</strong> Access to LinkedIn's professional network
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                <div>
                  <strong>Easy Applications:</strong> Candidates can apply directly through LinkedIn
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Required Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>Company ID:</strong> Your LinkedIn Company Page ID
              </div>
              <div>
                <strong>Job Function:</strong> Helps categorize the role
              </div>
              <div>
                <strong>Employment Type:</strong> Full-time, Part-time, Contract, etc.
              </div>
              <div>
                <strong>Workplace Type:</strong> Remote, On-site, or Hybrid
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>• Post jobs for 30-90 days</div>
              <div>• Use clear, specific job titles</div>
              <div>• Include detailed job descriptions</div>
              <div>• Specify location requirements</div>
              <div>• Add salary range if possible</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobAdvertising;