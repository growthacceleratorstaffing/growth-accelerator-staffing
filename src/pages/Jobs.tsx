import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Building, Clock, DollarSign, Search, AlertCircle, ExternalLink, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";

import { JobApplicationForm } from "@/components/job-search/JobApplicationForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { JobAdderTest } from "@/components/test/JobAdderTest";


const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  
  const { toast } = useToast();
  
  const { jobs, loading, error, useMockData, refetch } = useJobs();

  const testJobAdderAPI = async () => {
    setIsTestingAPI(true);
    try {
      console.log('Testing JobAdder API health...');
      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { endpoint: 'health' }
      });
      
      if (error) {
        console.error('JobAdder API test failed:', error);
        toast({
          title: "API Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('JobAdder API test success:', data);
        toast({
          title: "API Test Successful",
          description: `Status: ${data.status}, Has credentials: ${data.credentials?.hasClientId && data.credentials?.hasClientSecret}`,
        });
      }
    } catch (err) {
      console.error('API test exception:', err);
      toast({
        title: "API Test Exception",
        description: `Exception: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingAPI(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    refetch(value);
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
          <p className="text-muted-foreground mt-2">Find your next opportunity - synced with JobAdder</p>
        </div>
      </div>


      {error && useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} - Showing sample job listings for demonstration.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="vacancies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vacancies" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Vacancies ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            API Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacancies" className="space-y-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vacancies, companies, or locations..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading vacancies...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No vacancies found matching your search.</p>
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
                            {job.applicants && job.applicants.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Badge variant="outline">
                                  {job.applicants.length} Applicant{job.applicants.length !== 1 ? 's' : ''}
                                </Badge>
                              </span>
                            )}
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
                      {job.applicants && job.applicants.length > 0 && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Recent Applicants:</h4>
                          <div className="space-y-1">
                            {job.applicants.slice(0, 3).map((applicant, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                                <span>{applicant.candidate.firstName} {applicant.candidate.lastName}</span>
                                <span>{applicant.status.name}</span>
                              </div>
                            ))}
                            {job.applicants.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{job.applicants.length - 3} more applicants
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 font-semibold">
                            <DollarSign className="h-4 w-4" />
                            {job.salary 
                              ? `$${job.salary.rateLow?.toLocaleString()} - $${job.salary.rateHigh?.toLocaleString()}` 
                              : 'Competitive'
                            }
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Ref: {job.reference}
                            </span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              JobBoard
                            </Badge>
                          </div>
                        </div>
                         <div className="flex gap-2">
                           <Link to={`/jobs/${job.adId}`}>
                             <Button variant="outline">View Details</Button>
                           </Link>
                           <Button onClick={() => handleApplyClick(job)}>Apply Now</Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>


        <TabsContent value="debug" className="space-y-6">
          <JobAdderTest />
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