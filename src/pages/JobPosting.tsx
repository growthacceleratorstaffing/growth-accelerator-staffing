import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useJobs } from "@/hooks/useJobs";

const JobPosting = () => {
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: "",
    companyId: "",
    contactId: "",
    locationId: "",
    areaId: "",
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
  const { canPostJobs } = useAuth();
  const { refetch } = useJobs();

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please describe the position you want to create.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingWithAI(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-job-with-ai', {
        body: { prompt: aiPrompt }
      });

      if (error) {
        console.error('Supabase function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to generate job posting: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        console.error('No data returned from function');
        throw new Error('No data returned from AI service');
      }

      const { jobData } = data;
      
      // Map AI response to form fields
      setFormData({
        jobTitle: jobData.jobTitle || "",
        companyId: "1", // Default company ID
        contactId: "",
        locationId: "1", // Default location ID
        areaId: "",
        workTypeId: getWorkTypeId(jobData.workType),
        categoryId: "",
        subCategoryId: "",
        salaryRatePer: "Year",
        salaryRateLow: jobData.salaryLow?.toString() || "",
        salaryRateHigh: jobData.salaryHigh?.toString() || "",
        salaryCurrency: "USD",
        jobDescription: jobData.jobDescription || "",
        skillTags: jobData.skillTags || "",
        source: "AI Generated"
      });

      toast({
        title: "Success!",
        description: "Job posting generated with AI! Check the 'Job Description' field in the 'Manual Job Posting' section below - all form fields have been populated for your review.",
        className: "bg-pink-500 text-white border-pink-600",
      });
      
      setAiPrompt(""); // Clear the AI prompt
    } catch (error) {
      console.error('Error generating job with AI:', error);
      toast({
        title: "Error",
        description: "Failed to generate job posting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingWithAI(false);
    }
  };

  const getWorkTypeId = (workType: string) => {
    const workTypeMap: { [key: string]: string } = {
      "Full-time": "1",
      "Part-time": "2", 
      "Contract": "3",
      "Freelance": "4",
      "Internship": "5"
    };
    return workTypeMap[workType] || "1";
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePostJobSubmit = async (e: React.FormEvent) => {
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

    try {
      // First, save the job locally to the database
      const localJobData = {
        title: formData.jobTitle,
        company_id: formData.companyId,
        contact_id: formData.contactId || null,
        location_id: formData.locationId,
        area_id: formData.areaId || null,
        work_type_id: formData.workTypeId,
        category_id: formData.categoryId || null,
        sub_category_id: formData.subCategoryId || null,
        salary_rate_per: formData.salaryRatePer,
        salary_rate_low: formData.salaryRateLow ? parseFloat(formData.salaryRateLow) : null,
        salary_rate_high: formData.salaryRateHigh ? parseFloat(formData.salaryRateHigh) : null,
        salary_currency: formData.salaryCurrency,
        job_description: formData.jobDescription,
        skill_tags: formData.skillTags ? formData.skillTags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        source: formData.source || 'Website',
        synced_to_jobadder: false
      };

      // Save to local database
      const { data: localJob, error: localError } = await supabase
        .from('jobs')
        .insert([{
          ...localJobData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (localError) {
        throw new Error(`Failed to save job locally: ${localError.message}`);
      }

      console.log('Job saved locally:', localJob);

      // Try to sync to JobAdder API in the background (optional)
      try {
        const jobPayload = {
          endpoint: 'create-job',
          jobTitle: formData.jobTitle,
          companyId: parseInt(formData.companyId),
          contactId: formData.contactId ? parseInt(formData.contactId) : null,
          jobDescription: formData.jobDescription,
          location: {
            locationId: parseInt(formData.locationId),
            areaId: formData.areaId ? parseInt(formData.areaId) : null
          },
          workTypeId: parseInt(formData.workTypeId),
          category: formData.categoryId ? {
            categoryId: parseInt(formData.categoryId),
            subCategoryId: formData.subCategoryId ? parseInt(formData.subCategoryId) : null
          } : null,
          salary: (formData.salaryRateLow || formData.salaryRateHigh) ? {
            ratePer: formData.salaryRatePer,
            rateLow: formData.salaryRateLow ? parseFloat(formData.salaryRateLow) : null,
            rateHigh: formData.salaryRateHigh ? parseFloat(formData.salaryRateHigh) : null,
            currency: formData.salaryCurrency
          } : null,
          skillTags: formData.skillTags ? {
            matchAll: false,
            tags: formData.skillTags.split(',').map(tag => tag.trim()).filter(Boolean)
          } : null,
          source: formData.source || 'Website',
          numberOfJobs: 1
        };

        const { data: jobAdderResponse, error: jobAdderError } = await supabase.functions.invoke('jobadder-api', {
          body: jobPayload
        });

        if (!jobAdderError && jobAdderResponse) {
          // Update local job to mark as synced
          await supabase
            .from('jobs')
            .update({ 
              synced_to_jobadder: true,
              jobadder_job_id: jobAdderResponse.jobId?.toString() || null
            })
            .eq('id', localJob.id);
          
          console.log('Job successfully synced to JobAdder');
        } else {
          console.warn('Failed to sync to JobAdder, but job saved locally:', jobAdderError);
        }
      } catch (syncError) {
        console.warn('JobAdder sync failed, but job saved locally:', syncError);
      }
      
      toast({
        title: "Success!",
        description: "Job posting created successfully! It will appear in the Jobs section.",
        className: "bg-green-500 text-white border-green-600",
      });
      
      // Reset form and refresh jobs list
      setFormData({
        jobTitle: "",
        companyId: "",
        contactId: "",
        locationId: "",
        areaId: "",
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
      
      // Refresh the jobs list to show the new job
      refetch();
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: `Failed to create job posting: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Job Posting</h1>
          <p className="text-muted-foreground mt-2">Create and post new job opportunities - automatically synced to JobAdder</p>
        </div>
      </div>

      {/* AI Job Creator */}
      <div className="mb-16">
        <Card className="bg-primary/10 border-2 border-dashed border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-pink-500" />
              Create Your Vacancy with AI, or write it yourself
            </CardTitle>
            <CardDescription>
              Describe the position you want to create a vacancy for
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Textarea
                placeholder="e.g., Senior React Developer for a fintech startup, remote work, 5+ years experience, TypeScript expertise..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={6}
                className="min-h-[180px] resize-none"
              />
            </div>
            
              <div className="flex gap-4">
                <Button 
                  onClick={generateWithAI}
                  disabled={generatingWithAI || !aiPrompt.trim()}
                  className="flex-1 bg-pink-500 hover:bg-pink-600"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generatingWithAI ? "Generating..." : "Generate with AI"}
                </Button>
                <Button 
                  type="button"
                  className="flex-1 bg-pink-500 hover:bg-pink-600"
                  onClick={() => {
                    // Scroll to the manual form below
                    document.getElementById('manual-job-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
                <strong>✨ Bi-directional Sync:</strong> Jobs created here are automatically posted to JobAdder and will be visible in the Jobs section.
              </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Job Posting Form */}
      <div className="mt-16" id="manual-job-form">
        <Card>
          <CardHeader>
            <CardTitle>Manual Job Posting</CardTitle>
            <CardDescription>
              Fill out the details to create your job posting manually
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
                  <Label htmlFor="contactId">Contact ID</Label>
                  <Input
                    id="contactId"
                    placeholder="e.g. 201 (optional)"
                    value={formData.contactId}
                    onChange={(e) => handleInputChange("contactId", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="locationId">Location ID *</Label>
                  <Input
                    id="locationId"
                    placeholder="e.g. 301"
                    value={formData.locationId}
                    onChange={(e) => handleInputChange("locationId", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="areaId">Area ID</Label>
                  <Input
                    id="areaId"
                    placeholder="e.g. 401 (optional)"
                    value={formData.areaId}
                    onChange={(e) => handleInputChange("areaId", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category ID</Label>
                  <Input
                    id="categoryId"
                    placeholder="e.g. 1 (optional)"
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange("categoryId", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subCategoryId">Sub-Category ID</Label>
                  <Input
                    id="subCategoryId"
                    placeholder="e.g. 11 (optional)"
                    value={formData.subCategoryId}
                    onChange={(e) => handleInputChange("subCategoryId", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="workTypeId">Work Type ID *</Label>
                  <Select value={formData.workTypeId} onValueChange={(value) => handleInputChange("workTypeId", value)}>
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
                  Publish Job
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setFormData({
                      jobTitle: "",
                      companyId: "",
                      contactId: "",
                      locationId: "",
                      areaId: "",
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

export default JobPosting;