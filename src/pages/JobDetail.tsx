import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, MapPin, Building, DollarSign, Clock, User, AlertCircle } from "lucide-react";
import { useJobDetail } from "@/hooks/useJobDetail";

const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  
  const { jobDetail, loading, error, useMockData } = useJobDetail(
    jobId ? parseInt(jobId, 10) : 0
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
                  {jobDetail.company.name}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {jobDetail.location.name}
                </span>
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-sm mb-2">
                {jobDetail.workType?.name || 'Full-time'}
              </Badge>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Posted {new Date(jobDetail.postAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              {jobDetail.salary && (
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <DollarSign className="h-5 w-5" />
                  ${jobDetail.salary.rateLow?.toLocaleString()} - ${jobDetail.salary.rateHigh?.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">per {jobDetail.salary.ratePer}</span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                Ref: {jobDetail.reference}
              </span>
            </div>
            <Link to={`/jobs/${jobDetail.adId}/apply`}>
              <Button size="lg">Apply Now</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Job Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Job Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed">{jobDetail.summary}</p>
        </CardContent>
      </Card>

      {/* Job Description */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="leading-relaxed whitespace-pre-wrap">{jobDetail.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      {jobDetail.requirements && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed whitespace-pre-wrap">{jobDetail.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      {jobDetail.benefits && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed whitespace-pre-wrap">{jobDetail.benefits}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Points */}
      {jobDetail.bulletPoints && jobDetail.bulletPoints.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Key Points</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {jobDetail.bulletPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {jobDetail.skillTags && jobDetail.skillTags.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {jobDetail.skillTags.map((skill, index) => (
                <Badge key={index} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      {jobDetail.owner && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{jobDetail.owner.firstName} {jobDetail.owner.lastName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{jobDetail.owner.email}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Stats */}
      {jobDetail.applications && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Application Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{jobDetail.applications.total}</div>
                <div className="text-sm text-muted-foreground">Total Applications</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{jobDetail.applications.new}</div>
                <div className="text-sm text-muted-foreground">New Applications</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{jobDetail.applications.active}</div>
                <div className="text-sm text-muted-foreground">Active Applications</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Link to={`/jobs/${jobDetail.adId}/apply`}>
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