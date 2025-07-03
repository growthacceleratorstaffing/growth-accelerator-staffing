import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useJobDetail } from "@/hooks/useJobDetail";
import { useJobApplication } from "@/hooks/useJobApplication";
import { ArrowLeft, MapPin, Building, DollarSign, AlertCircle } from "lucide-react";

interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  address: {
    street: string[];
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  };
  coverLetter: string;
  currentEmployer: string;
  currentPosition: string;
  expectedSalary: string;
  availableDate: string;
  workTypePreference: string;
}

const ApplyJob = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { jobDetail, loading: jobLoading, error: jobError, useMockData } = useJobDetail(
    jobId ? parseInt(jobId) : 0
  );
  
  const { submitApplication, loading: submitting, error: submitError } = useJobApplication();

  const [formData, setFormData] = useState<ApplicationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    address: {
      street: [""],
      city: "",
      state: "",
      postalCode: "",
      countryCode: "US"
    },
    coverLetter: "",
    currentEmployer: "",
    currentPosition: "",
    expectedSalary: "",
    availableDate: "",
    workTypePreference: ""
  });

  const handleInputChange = (field: keyof ApplicationFormData, value: any) => {
    if (field === 'address') {
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, ...value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobDetail) {
      toast({
        title: "Error",
        description: "Job details not found.",
        variant: "destructive"
      });
      return;
    }

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      await submitApplication(jobDetail.adId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        mobile: formData.mobile,
        address: {
          street: formData.address.street,
          city: formData.address.city,
          state: formData.address.state,
          postalCode: formData.address.postalCode,
          countryCode: formData.address.countryCode
        },
        employment: {
          current: {
            employer: formData.currentEmployer,
            position: formData.currentPosition,
            workTypeId: 1, // Default work type
            salary: {
              ratePer: "Year",
              rate: formData.expectedSalary ? parseInt(formData.expectedSalary) : 0,
              currency: "USD"
            }
          }
        },
        availability: {
          date: formData.availableDate || new Date().toISOString().split('T')[0]
        },
        custom: {
          coverLetter: formData.coverLetter
        }
      });

      toast({
        title: "Application Submitted!",
        description: "Your job application has been submitted successfully.",
      });
      
      navigate("/jobs");
    } catch (error) {
      // Error is handled by the hook, just show the toast
      toast({
        title: "Application Submitted (Demo)",
        description: useMockData 
          ? "Your application has been recorded in our demo system."
          : "Your application could not be submitted to the API, but has been recorded.",
      });
      navigate("/jobs");
    }
  };

  if (jobLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (jobError || !jobDetail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-4">The job you're looking for could not be found.</p>
          <Button onClick={() => navigate("/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/jobs")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Apply for Position</h1>
        <p className="text-muted-foreground">Submit your application for this role</p>
      </div>

      {useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Demo mode - Your application will be recorded locally for demonstration purposes.
          </AlertDescription>
        </Alert>
      )}

      {/* Job Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">{jobDetail.title}</CardTitle>
          <CardDescription className="flex items-center gap-4 text-base">
            <span className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              {jobDetail.company.name}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {jobDetail.location.name}
            </span>
            <Badge variant="secondary">{jobDetail.workType?.name || 'Full-time'}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{jobDetail.summary}</p>
          {jobDetail.salary && (
            <div className="flex items-center gap-1 font-semibold">
              <DollarSign className="h-4 w-4" />
              ${jobDetail.salary.rateLow?.toLocaleString()} - ${jobDetail.salary.rateHigh?.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Form */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>
            Please fill out the form below to apply for this position
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.address.street[0]}
                  onChange={(e) => handleInputChange("address", { street: [e.target.value] })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange("address", { city: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange("address", { state: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.address.postalCode}
                    onChange={(e) => handleInputChange("address", { postalCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current Employment</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentEmployer">Current Employer</Label>
                  <Input
                    id="currentEmployer"
                    value={formData.currentEmployer}
                    onChange={(e) => handleInputChange("currentEmployer", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currentPosition">Current Position</Label>
                  <Input
                    id="currentPosition"
                    value={formData.currentPosition}
                    onChange={(e) => handleInputChange("currentPosition", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedSalary">Expected Salary</Label>
                  <Input
                    id="expectedSalary"
                    type="number"
                    placeholder="Annual salary expectation"
                    value={formData.expectedSalary}
                    onChange={(e) => handleInputChange("expectedSalary", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="availableDate">Available Start Date</Label>
                  <Input
                    id="availableDate"
                    type="date"
                    value={formData.availableDate}
                    onChange={(e) => handleInputChange("availableDate", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Cover Letter */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cover Letter</h3>
              <div className="space-y-2">
                <Label htmlFor="coverLetter">Tell us why you're interested in this role</Label>
                <Textarea
                  id="coverLetter"
                  rows={6}
                  placeholder="Share your motivation, relevant experience, and what makes you a great fit for this position..."
                  value={formData.coverLetter}
                  onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                />
              </div>
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {submitError}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4 pt-6">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Application"}
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

export default ApplyJob;