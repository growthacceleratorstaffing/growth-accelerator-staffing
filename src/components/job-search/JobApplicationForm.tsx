import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobApplication } from "@/hooks/useJobApplication";
import { JazzHRJob } from "@/lib/jazzhr-api";
import { useToast } from "@/hooks/use-toast";

interface JobApplicationFormProps {
  job: JazzHRJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JobApplicationForm = ({ job, isOpen, onClose }: JobApplicationFormProps) => {
  const { submitApplication, loading } = useJobApplication();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
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
      countryCode: "AU"
    },
    employment: {
      current: {
        employer: "",
        position: "",
        workTypeId: 1
      },
      ideal: {
        position: "",
        workTypeId: 1
      }
    },
    availability: {
      immediate: true
    },
    education: [{
      institution: "",
      course: "",
      date: ""
    }],
    skillTags: [] as string[]
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev] as any,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!job) return;

    try {
      // Send email notification
      const emailResponse = await fetch('/functions/v1/send-job-application-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantName: `${formData.firstName} ${formData.lastName}`,
          applicantEmail: formData.email,
          jobTitle: job.title,
          companyName: job.department || 'Unknown Company',
          applicationData: formData
        })
      });

      if (emailResponse.ok) {
        console.log('Email notification sent successfully');
      } else {
        console.warn('Failed to send email notification');
      }

      // Submit to JazzHR
      const response = await submitApplication(job.id, formData);
      
      toast({
        title: "Application Submitted",
        description: `Your application for ${job.title} has been submitted successfully! A notification has been sent to the hiring team.`,
      });
      
      onClose();
      
      // Reset form
      setFormData({
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
          countryCode: "AU"
        },
        employment: {
          current: {
            employer: "",
            position: "",
            workTypeId: 1
          },
          ideal: {
            position: "",
            workTypeId: 1
          }
        },
        availability: {
          immediate: true
        },
        education: [{
          institution: "",
          course: "",
          date: ""
        }],
        skillTags: []
      });
    } catch (error) {
      toast({
        title: "Application Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {job.title}</DialogTitle>
          <DialogDescription>
            {job.department} • {job.city && job.state ? `${job.city}, ${job.state}` : "Location TBD"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange("mobile", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.address.street[0]}
                  onChange={(e) => handleNestedChange("address", "street", [e.target.value])}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleNestedChange("address", "city", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => handleNestedChange("address", "state", e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.address.postalCode}
                  onChange={(e) => handleNestedChange("address", "postalCode", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Employment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Employment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentEmployer">Current Employer</Label>
                <Input
                  id="currentEmployer"
                  value={formData.employment.current.employer}
                  onChange={(e) => handleNestedChange("employment", "current", {
                    ...formData.employment.current,
                    employer: e.target.value
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="currentPosition">Current Position</Label>
                <Input
                  id="currentPosition"
                  value={formData.employment.current.position}
                  onChange={(e) => handleNestedChange("employment", "current", {
                    ...formData.employment.current,
                    position: e.target.value
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={formData.education[0].institution}
                  onChange={(e) => handleInputChange("education", [{
                    ...formData.education[0],
                    institution: e.target.value
                  }])}
                />
              </div>
              
              <div>
                <Label htmlFor="course">Course/Degree</Label>
                <Input
                  id="course"
                  value={formData.education[0].course}
                  onChange={(e) => handleInputChange("education", [{
                    ...formData.education[0],
                    course: e.target.value
                  }])}
                />
              </div>
              
              <div>
                <Label htmlFor="graduationDate">Graduation Date</Label>
                <Input
                  id="graduationDate"
                  value={formData.education[0].date}
                  onChange={(e) => handleInputChange("education", [{
                    ...formData.education[0],
                    date: e.target.value
                  }])}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};