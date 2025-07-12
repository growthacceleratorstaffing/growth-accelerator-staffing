import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Linkedin, DollarSign, Calendar, Target, Briefcase, Megaphone } from "lucide-react";

// Self-contained Job Advertising component with LinkedIn API integration
// Requires LinkedIn API credentials to be set as environment variables or secrets
const ExportableJobAdvertising = () => {
  // Toast functionality - replace with your toast implementation
  const toast = (options: { title: string; description: string; variant?: "default" | "destructive" }) => {
    alert(`${options.title}: ${options.description}`);
  };

  // Job Posting Form Data
  const [jobFormData, setJobFormData] = useState({
    jobTitle: "",
    jobDescription: "",
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

  // LinkedIn Job Advertisement Edge Function
  const createLinkedInJobAdvertisement = async (data: any) => {
    // This calls the Supabase edge function - replace with your own API endpoint
    const response = await fetch('/api/linkedin-job-advertisement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`, // Replace with your auth method
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  };

  const handleCreateJob = async () => {
    console.log('Starting career page job creation...');
    console.log('Form data:', jobFormData);
    
    if (!jobFormData.jobTitle || !jobFormData.jobDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in job title and description",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingJob(true);
    console.log('Invoking job creation function...');
    
    try {
      const data = await createLinkedInJobAdvertisement({
        type: 'job-posting',
        jobTitle: jobFormData.jobTitle,
        jobDescription: jobFormData.jobDescription,
        city: jobFormData.city,
        jobFunction: jobFormData.jobFunction,
        employmentType: jobFormData.employmentType,
        workplaceType: jobFormData.workplaceType,
        duration: parseInt(jobFormData.duration) || 30
      });

      console.log('Function response:', data);
      console.log('Career page job creation successful!');
      
      toast({
        title: data.linkedinError ? "Job Created with LinkedIn Issue" : "Job Created Successfully!",
        description: data.message,
        variant: data.linkedinError ? "destructive" : "default"
      });

      // Reset form
      setJobFormData({
        jobTitle: "",
        jobDescription: "",
        city: "",
        jobFunction: "",
        employmentType: "FULL_TIME",
        workplaceType: "REMOTE",
        duration: ""
      });

    } catch (error) {
      console.error('Error creating career page job:', error);
      toast({
        title: "Error",
        description: "Failed to create job posting. Please try again.",
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
      const data = await createLinkedInJobAdvertisement({
        type: 'sponsored-content',
        jobTitle: adFormData.jobTitle,
        jobDescription: adFormData.jobDescription,
        budget: parseFloat(adFormData.budget),
        duration: parseInt(adFormData.duration),
        targetAudience: adFormData.targetAudience,
        campaignName: adFormData.campaignName || adFormData.jobTitle
      });

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
        <Briefcase className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Job Management</h1>
          <p className="text-muted-foreground">Create jobs for your career page and LinkedIn advertisements</p>
        </div>
      </div>

      {/* API Setup Instructions */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">🔑 Required API Setup</CardTitle>
        </CardHeader>
        <CardContent className="text-orange-700 space-y-2">
          <p><strong>Required LinkedIn API credentials (set as environment variables or secrets):</strong></p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><code>LINKEDIN_CLIENT_ID</code> - Your LinkedIn app client ID</li>
            <li><code>LINKEDIN_CLIENT_SECRET</code> - Your LinkedIn app client secret</li>
            <li><code>LINKEDIN_ACCESS_TOKEN</code> - Valid LinkedIn access token with job posting permissions</li>
          </ul>
          <p className="text-sm mt-2">
            Get these from: <a href="https://developer.linkedin.com/" target="_blank" className="underline">LinkedIn Developer Portal</a>
          </p>
        </CardContent>
      </Card>

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
                  <CardTitle>Create Career Page Job & LinkedIn Job Posting</CardTitle>
                  <CardDescription>
                    Add job openings to your career page and automatically post them as jobs on LinkedIn's job board
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
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="e.g. San Francisco (leave empty for Remote)"
                        value={jobFormData.city}
                        onChange={(e) => handleJobInputChange("city", e.target.value)}
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  <Button 
                    onClick={handleCreateJob}
                    disabled={isCreatingJob}
                    className="w-full"
                  >
                    {isCreatingJob ? "Creating Job & LinkedIn Posting..." : "Create Job & Post to LinkedIn"}
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
                    Career Page Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <strong>Career Page:</strong> Job posted directly to your website
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    <div>
                      <strong>LinkedIn Job Board:</strong> Official job posting on LinkedIn's job board
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Professional Reach:</strong> Candidates can apply directly through LinkedIn
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Dual Visibility:</strong> Maximum exposure across both platforms
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Job Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <strong>Job Function:</strong> Helps categorize the role
                  </div>
                  <div>
                    <strong>Employment Type:</strong> Full-time, Part-time, Contract, etc.
                  </div>
                  <div>
                    <strong>Workplace Type:</strong> Remote, On-site, or Hybrid
                  </div>
                  <div>
                    <strong>Location:</strong> Leave empty for Remote positions
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
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Input
                      id="targetAudience"
                      placeholder="e.g. Software Engineers, Product Managers"
                      value={adFormData.targetAudience}
                      onChange={(e) => handleAdInputChange("targetAudience", e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleCreateAdvertisement}
                    disabled={isCreatingAd}
                    className="w-full"
                  >
                    {isCreatingAd ? "Creating LinkedIn Advertisement..." : "Create LinkedIn Advertisement"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Advertisement Info Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5" />
                    LinkedIn Advertising Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    <div>
                      <strong>Targeted Reach:</strong> Reach specific professionals by skills, experience, and location
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                    <div>
                      <strong>Premium Visibility:</strong> Your job appears prominently in LinkedIn feeds
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                    <div>
                      <strong>Performance Tracking:</strong> Detailed analytics on impressions, clicks, and applications
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                    <div>
                      <strong>Faster Hiring:</strong> Reach passive candidates who might not be actively job searching
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Pricing & Budget Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <strong>Daily Budget:</strong> Budget is divided evenly across campaign duration
                  </div>
                  <div>
                    <strong>Minimum Budget:</strong> LinkedIn typically requires $10+ per day
                  </div>
                  <div>
                    <strong>Recommended:</strong> $300-500 for 30 days for good reach
                  </div>
                  <div>
                    <strong>Cost Model:</strong> CPM (Cost Per Mille) - you pay per 1000 impressions
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExportableJobAdvertising;

/*
=== API INTEGRATION GUIDE ===

To use this component in another project, you'll need to:

1. Set up the LinkedIn Job Advertisement API endpoint (/api/linkedin-job-advertisement)
   This should handle both job posting and sponsored content creation

2. Configure LinkedIn API credentials:
   - LINKEDIN_CLIENT_ID: Your LinkedIn app client ID
   - LINKEDIN_CLIENT_SECRET: Your LinkedIn app client secret  
   - LINKEDIN_ACCESS_TOKEN: Valid access token with job posting permissions

3. API Endpoint Structure:
   POST /api/linkedin-job-advertisement
   
   Request Body for Job Posting:
   {
     "type": "job-posting",
     "jobTitle": "Software Engineer",
     "jobDescription": "Job description...",
     "city": "San Francisco",
     "jobFunction": "eng",
     "employmentType": "FULL_TIME",
     "workplaceType": "REMOTE",
     "duration": 30
   }
   
   Request Body for Sponsored Content:
   {
     "type": "sponsored-content",
     "jobTitle": "Software Engineer", 
     "jobDescription": "Job description...",
     "budget": 500,
     "duration": 30,
     "targetAudience": "Software Engineers",
     "campaignName": "Hiring Campaign"
   }

4. Expected Response:
   {
     "success": true,
     "message": "Job created successfully",
     "jobId": "123",
     "jobUrl": "https://example.com/jobs/123"
   }

5. Error Handling:
   {
     "error": "Error message",
     "details": "Additional error details"
   }

6. Replace the toast function with your preferred notification system

7. Update the API endpoint URL to match your backend setup

=== LINKEDIN API REQUIREMENTS ===

To get LinkedIn API access:
1. Create a LinkedIn app at https://developer.linkedin.com/
2. Request access to LinkedIn Marketing Developer Platform
3. Get approval for job posting and advertising APIs
4. Obtain necessary permissions and tokens

Required LinkedIn API Permissions:
- rw_organization_admin (for job postings)
- rw_ads (for sponsored content)
- r_organization_social (for company info)

=== DATABASE INTEGRATION ===

The job posting functionality saves jobs to a database. You'll need:
1. A jobs table with fields: title, job_description, company_name, location_name, etc.
2. Database connection and insert logic in your API endpoint
3. Proper error handling for database operations

*/