
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, DollarSign, Clock, Building, AlertCircle, Search, ExternalLink } from "lucide-react";
import { useJazzHRJobs } from "@/hooks/useJazzHRJobs";
import { useToast } from "@/hooks/use-toast";
import { JobApplicationForm } from "@/components/job-search/JobApplicationForm";
import { supabase } from "@/integrations/supabase/client";

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const navigate = useNavigate();
  
  const { data: allJobs = [], isLoading: loading, error } = useJazzHRJobs({
    title: searchTerm || undefined,
    status: 'Open'
  });

  // Client-side filter to ensure only open jobs are shown
  const jobs = allJobs.filter(job => job.status === 'Open');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  const handleCloseForm = () => {
    setShowApplicationForm(false);
    setSelectedJob(null);
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vacancies</h1>
          <p className="text-muted-foreground mt-2">Find your next opportunity - synced with JazzHR</p>
        </div>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load JazzHR jobs. Please check your connection.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="vacancies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vacancies">Vacancies</TabsTrigger>
        </TabsList>

        <TabsContent value="vacancies" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title, company, or location..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/job/${job.id}`)}>
                  <CardHeader>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {job.department || "Growth Accelerator"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {job.city && job.state ? `${job.city}, ${job.state}` : "Remote"}
                    </div>
                    
                    {job.status && (
                      <Badge variant={job.status === 'Open' ? 'default' : 'secondary'}>{job.status}</Badge>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {job.description ? 
                        job.description
                          .replace(/<[^>]*>/g, '') // Remove HTML tags
                          .replace(/&amp;/g, '&')  // Decode HTML entities
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'")
                          .replace(/&nbsp;/g, ' ')
                        : "No description available"
                      }
                    </p>
                    
                    <div className="flex justify-between items-center pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyClick(job);
                        }}
                      >
                        Apply Now
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : "JazzHR Job"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {jobs.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-muted-foreground">No jobs found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search terms or check back later for new JazzHR job postings.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <JobApplicationForm
        job={selectedJob}
        isOpen={showApplicationForm}
        onClose={handleCloseForm}
      />
    </div>
  );
};

export default Jobs;
