import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Linkedin, DollarSign, Calendar, Target, Briefcase, Megaphone } from "lucide-react";

const JobAdvertising = () => {
  const { toast } = useToast();
  
  // Job Posting Form Data
  const [jobFormData, setJobFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    companyId: "",
    city: "",
    jobFunction: "",
    employmentType: "FULL_TIME",
    workplaceType: "REMOTE",
    duration: ""
  });

  // Advertisement Form Data
  const [adFormData, setAdFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    budget: "",
    duration: "",
    targetAudience: "",
    campaignName: ""
  });

  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isCreatingAd, setIsCreatingAd] = useState(false);

  const handleJobInputChange = (field: string, value: string) => {
    setJobFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdInputChange = (field: string, value: string) => {
    setAdFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateJob = async () => {
    console.log('Starting LinkedIn job posting creation...');
    console.log('Form data:', jobFormData);
    
    if (!jobFormData.jobTitle || !jobFormData.jobDescription || !jobFormData.companyId) {
      toast({
        title: "Missing Information",
        description: "Please fill in job title, description, and company ID",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingJob(true);
    console.log('Invoking LinkedIn job advertisement function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-job-advertisement', {
        body: {
          type: 'job-posting',
          jobTitle: jobFormData.jobTitle,
          jobDescription: jobFormData.jobDescription,
          companyId: jobFormData.companyId,
          city: jobFormData.city,
          jobFunction: jobFormData.jobFunction,
          employmentType: jobFormData.employmentType,
          workplaceType: jobFormData.workplaceType,
          duration: parseInt(jobFormData.duration) || 30
        }
      });

      console.log('Function response:', { data, error });

      if (error) throw error;

      console.log('LinkedIn job posting successful!');
      toast({
        title: "Job Shared!",
        description: `Job shared on LinkedIn and added to career page! Post: ${data.postUrl}`
      });

      // Reset form
      setJobFormData({
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
      setIsCreatingJob(false);
    }
  };

  const handleCreateAdvertisement = async () => {
    if (!adFormData.jobTitle || !adFormData.budget || !adFormData.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in job title, budget, and duration",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingAd(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-job-advertisement', {
        body: {
          type: 'sponsored-content',
          jobTitle: adFormData.jobTitle,
          jobDescription: adFormData.jobDescription,
          budget: parseFloat(adFormData.budget),
          duration: parseInt(adFormData.duration),
          targetAudience: adFormData.targetAudience,
          campaignName: adFormData.campaignName || adFormData.jobTitle
        }
      });

      if (error) throw error;

      toast({
        title: "Advertisement Created",
        description: "Your LinkedIn job advertisement has been created successfully!"
      });

      // Reset form
      setAdFormData({
        jobTitle: "",
        jobDescription: "",
        budget: "",
        duration: "",
        targetAudience: "",
        campaignName: ""
      });

    } catch (error) {
      console.error('Error creating LinkedIn advertisement:', error);
      toast({
        title: "Error",
        description: "Failed to create LinkedIn advertisement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAd(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Linkedin className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Job Management</h1>
          <p className="text-muted-foreground">Post jobs and create advertisements on LinkedIn</p>
        </div>
      </div>

      <Tabs defaultValue="job-posting" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="job-posting" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Job Posting
          </TabsTrigger>
          <TabsTrigger value="advertisement" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Sponsored Ads
          </TabsTrigger>
        </TabsList>

        {/* Job Posting Tab */}
        <TabsContent value="job-posting">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Share Job on LinkedIn</CardTitle>
                  <CardDescription>
                    Share job openings on your LinkedIn company page and create listings on your career page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title *</Label>
                      <Input
                        id="jobTitle"
                        placeholder="e.g. Senior Software Engineer"
                        value={jobFormData.jobTitle}
                        onChange={(e) => handleJobInputChange("jobTitle", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyId">Company ID *</Label>
                      <Input
                        id="companyId"
                        placeholder="LinkedIn Company ID"
                        value={jobFormData.companyId}
                        onChange={(e) => handleJobInputChange("companyId", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description *</Label>
                    <Textarea
                      id="jobDescription"
                      placeholder="Describe the role, requirements, and benefits..."
                      rows={4}
                      value={jobFormData.jobDescription}
                      onChange={(e) => handleJobInputChange("jobDescription", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="e.g. San Francisco (leave empty for Remote)"
                        value={jobFormData.city}
                        onChange={(e) => handleJobInputChange("city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobFunction">Job Function</Label>
                      <Select onValueChange={(value) => handleJobInputChange("jobFunction", value)}>
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
                      <Select onValueChange={(value) => handleJobInputChange("employmentType", value)}>
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
                      <Select onValueChange={(value) => handleJobInputChange("workplaceType", value)}>
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
                    <Select onValueChange={(value) => handleJobInputChange("duration", value)}>
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
                    onClick={handleCreateJob}
                    disabled={isCreatingJob}
                    className="w-full"
                  >
                    {isCreatingJob ? "Sharing Job..." : "Share Job on LinkedIn"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Job Posting Info Panel */}
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
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <strong>Company Page Posts:</strong> Share job openings on your LinkedIn company page
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Career Page Integration:</strong> Jobs are added to your website's career page
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Professional Reach:</strong> Leverage your company's LinkedIn network
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
            </div>
          </div>
        </TabsContent>

        {/* Advertisement Tab */}
        <TabsContent value="advertisement">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Create LinkedIn Sponsored Content</CardTitle>
                  <CardDescription>
                    Create paid advertisements to promote your job openings - Paid
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adJobTitle">Job Title *</Label>
                      <Input
                        id="adJobTitle"
                        placeholder="e.g. Senior Software Engineer"
                        value={adFormData.jobTitle}
                        onChange={(e) => handleAdInputChange("jobTitle", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="campaignName">Campaign Name</Label>
                      <Input
                        id="campaignName"
                        placeholder="Leave empty to use job title"
                        value={adFormData.campaignName}
                        onChange={(e) => handleAdInputChange("campaignName", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adJobDescription">Job Description</Label>
                    <Textarea
                      id="adJobDescription"
                      placeholder="Describe the role for the advertisement..."
                      rows={4}
                      value={adFormData.jobDescription}
                      onChange={(e) => handleAdInputChange("jobDescription", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget (USD) *</Label>
                      <Input
                        id="budget"
                        type="number"
                        placeholder="e.g. 500"
                        value={adFormData.budget}
                        onChange={(e) => handleAdInputChange("budget", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adDuration">Duration (Days) *</Label>
                      <Select onValueChange={(value) => handleAdInputChange("duration", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Input
                      id="targetAudience"
                      placeholder="e.g. Software Engineers in San Francisco"
                      value={adFormData.targetAudience}
                      onChange={(e) => handleAdInputChange("targetAudience", e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleCreateAdvertisement}
                    disabled={isCreatingAd}
                    className="w-full"
                  >
                    {isCreatingAd ? "Creating Advertisement..." : "Create LinkedIn Advertisement"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Advertisement Info Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Advertisement Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Targeted Reach:</strong> Reach qualified candidates based on skills, location, and experience
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Performance Tracking:</strong> Monitor clicks, applications, and engagement
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Higher Visibility:</strong> Promoted content in LinkedIn feed
                    </div>
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
                  <div>• Run ads for at least 7-14 days</div>
                  <div>• Target specific skills and locations</div>
                  <div>• Use clear, compelling job titles</div>
                  <div>• Include salary range if possible</div>
                  <div>• Monitor and adjust targeting</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobAdvertising;