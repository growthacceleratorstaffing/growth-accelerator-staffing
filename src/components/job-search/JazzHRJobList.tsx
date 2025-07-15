import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JazzHRJob } from "@/lib/jazzhr-api";
import { Calendar, MapPin, Building2, FileText, Eye, UserPlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface JazzHRJobListProps {
  jobs: JazzHRJob[];
  isLoading: boolean;
}

const getJobStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open':
      return "bg-green-500 text-white";
    case 'on hold':
      return "bg-yellow-500 text-white";
    case 'approved':
      return "bg-blue-500 text-white";
    case 'needs approval':
      return "bg-orange-500 text-white";
    case 'drafting':
      return "bg-gray-500 text-white";
    case 'filled':
      return "bg-purple-500 text-white";
    case 'cancelled':
    case 'closed':
      return "bg-red-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

export const JazzHRJobList = ({ jobs, isLoading }: JazzHRJobListProps) => {
  const [selectedJob, setSelectedJob] = useState<JazzHRJob | null>(null);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-200 rounded"></div>
                <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No JazzHR jobs found</h3>
        <p className="text-muted-foreground text-lg">No JazzHR jobs found.</p>
      </div>
    );
  }

  const handleApplyClick = (job: JazzHRJob) => {
    setSelectedJob(job);
  };

  const handleImportJob = async (job: JazzHRJob) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('No authenticated user found');
      }

      const jobData = {
        title: job.title,
        job_description: job.description,
        company_name: job.department || "JazzHR Job",
        location_name: [job.city, job.state].filter(Boolean).join(', '),
        source: "JazzHR",
        created_by: user.user.id,
        jazzhr_job_id: job.id
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Job imported successfully",
        description: `${job.title} has been imported to your jobs database.`,
      });
    } catch (error) {
      console.error('Error importing job:', error);
      toast({
        title: "Import failed",
        description: "Failed to import job. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-sm font-medium text-foreground line-clamp-2">
                  {job.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getJobStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {job.department && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{job.department}</span>
              </div>
            )}
            
            {(job.city || job.state) && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{[job.city, job.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            
            {job.employment_type && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{job.employment_type}</span>
              </div>
            )}
            
            {job.created_at && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Posted: {new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{job.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Department:</strong> {job.department || 'N/A'}
                      </div>
                      <div>
                        <strong>Status:</strong> {job.status}
                      </div>
                      <div>
                        <strong>Location:</strong> {[job.city, job.state].filter(Boolean).join(', ') || 'N/A'}
                      </div>
                      <div>
                        <strong>Employment Type:</strong> {job.employment_type || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <strong>Description:</strong>
                      <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                        {job.description || 'No description available.'}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                size="sm" 
                onClick={() => handleImportJob(job)}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};