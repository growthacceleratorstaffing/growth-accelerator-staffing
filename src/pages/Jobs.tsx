import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Building, Clock, DollarSign, Search, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { jobs, loading, error, useMockData, refetch } = useJobs();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    refetch(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading jobs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Job Listings</h1>
          <p className="text-muted-foreground mt-2">Find your next opportunity</p>
        </div>
        <Link to="/post-job">
          <Button>Post a Job</Button>
        </Link>
      </div>

      {error && useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} - Showing sample job listings for demonstration.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies, or locations..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No jobs found matching your search.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <Card key={job.adId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-base">
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {job.company.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location.name}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{job.workType?.name || 'Full-time'}</Badge>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(job.postAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{job.summary}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {job.salary 
                        ? `$${job.salary.rateLow?.toLocaleString()} - $${job.salary.rateHigh?.toLocaleString()}` 
                        : 'Competitive'
                      }
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Ref: {job.reference}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/jobs/${job.adId}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                    <Link to={`/jobs/${job.adId}/apply`}>
                      <Button>Apply Now</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Jobs;