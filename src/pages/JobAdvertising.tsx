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
    budget: "",
    duration: "",
    targetAudience: "",
    campaignName: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateAdvertisement = async () => {
    if (!formData.jobTitle || !formData.budget || !formData.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
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
          budget: parseFloat(formData.budget),
          duration: parseInt(formData.duration),
          targetAudience: formData.targetAudience,
          campaignName: formData.campaignName || formData.jobTitle
        }
      });

      if (error) throw error;

      toast({
        title: "Advertisement Created",
        description: "Your LinkedIn job advertisement has been created successfully!"
      });

      // Reset form
      setFormData({
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
              <CardTitle>Create LinkedIn Job Advertisement</CardTitle>
              <CardDescription>
                Create a targeted job advertisement to reach potential candidates on LinkedIn
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
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    placeholder="Leave empty to use job title"
                    value={formData.campaignName}
                    onChange={(e) => handleInputChange("campaignName", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description</Label>
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
                  <Label htmlFor="budget">Budget (USD) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="e.g. 500"
                    value={formData.budget}
                    onChange={(e) => handleInputChange("budget", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (Days) *</Label>
                  <Select onValueChange={(value) => handleInputChange("duration", value)}>
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
                  value={formData.targetAudience}
                  onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                />
              </div>

              <Button 
                onClick={handleCreateAdvertisement}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? "Creating Advertisement..." : "Create LinkedIn Advertisement"}
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
                  <strong>Professional Network:</strong> Access LinkedIn's professional user base
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                <div>
                  <strong>Performance Tracking:</strong> Monitor clicks, applications, and engagement
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>Cost per Click:</strong> $2-$5 USD
              </div>
              <div>
                <strong>Recommended Budget:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Small campaign: $200-$500</li>
                  <li>• Medium campaign: $500-$1000</li>
                  <li>• Large campaign: $1000+</li>
                </ul>
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
    </div>
  );
};

export default JobAdvertising;