import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, MapPin, Building, DollarSign, Clock, User, AlertCircle } from "lucide-react";
import { useJobDetail } from "@/hooks/useJobDetail";

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { jobDetail, loading, error, useMockData } = useJobDetail(
    id || ""
  );

  if (loading) {
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

  if (error || !jobDetail) {
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
      </div>

      {useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Demo mode - Showing sample job data for demonstration purposes.
          </AlertDescription>
        </Alert>
      )}

      {/* Job Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl mb-2">{jobDetail.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 text-lg">
                <span className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {jobDetail.department || "Company"}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {jobDetail.city && jobDetail.state ? `${jobDetail.city}, ${jobDetail.state}` : "Location TBD"}
                </span>
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-sm mb-2">
                {jobDetail.employment_type || 'Full-time'}
              </Badge>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Posted {jobDetail.created_at ? new Date(jobDetail.created_at).toLocaleDateString() : "Recently"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <DollarSign className="h-5 w-5" />
                Competitive salary
              </div>
              <span className="text-sm text-muted-foreground">
                Ref: {jobDetail.id}
              </span>
            </div>
            <Link to={`/job/${jobDetail.id}/apply`}>
              <Button size="lg">Apply Now</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Job Description */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="leading-relaxed whitespace-pre-wrap">{jobDetail.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {jobDetail.hiring_lead && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Hiring Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{jobDetail.hiring_lead}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Link to={`/job/${jobDetail.id}/apply`}>
          <Button size="lg" className="px-8">Apply Now</Button>
        </Link>
        <Button variant="outline" size="lg" onClick={() => navigate("/jobs")}>
          Back to All Jobs
        </Button>
      </div>
    </div>
  );
};

export default JobDetail;