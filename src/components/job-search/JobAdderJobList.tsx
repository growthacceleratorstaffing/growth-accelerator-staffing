import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Calendar, Building, DollarSign } from "lucide-react";
import { JobAdderJob } from "@/hooks/useJobs";

interface JobAdderJobListProps {
  jobs: JobAdderJob[];
  isLoading: boolean;
}

export const JobAdderJobList = ({ jobs, isLoading }: JobAdderJobListProps) => {
  if (isLoading) {
    return (
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
                <div className="h-3 bg-muted rounded w-4/5"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No JobAdder jobs found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.adId} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Building className="h-4 w-4" />
                  {job.company?.name || 'Company not specified'}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="ml-2">
                {job.workType?.name || 'Type not specified'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {job.location?.name || 'Location not specified'}
                {job.location?.area && ` - ${job.location.area.name}`}
              </div>
              {(job.portal?.salary || job.salary) && (
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <DollarSign className="h-4 w-4" />
                  {job.portal?.salary ? (
                    `${job.portal.salary.rateLow ? job.portal.salary.rateLow.toLocaleString() : 'N/A'} - ${job.portal.salary.rateHigh ? job.portal.salary.rateHigh.toLocaleString() : 'N/A'} ${job.portal.salary.ratePer}`
                  ) : job.salary && job.salary.rateLow && job.salary.rateHigh ? (
                    `${job.salary.currency} ${job.salary.rateLow.toLocaleString()} - ${job.salary.rateHigh.toLocaleString()} ${job.salary.ratePer}`
                  ) : (
                    'Salary not specified'
                  )}
                </div>
              )}
              {(job.postedAt || job.postAt) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Posted: {new Date(job.postedAt || job.postAt!).toLocaleDateString()}
                </div>
              )}
            </div>
            
            {job.bulletPoints && job.bulletPoints.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  {job.bulletPoints.slice(0, 3).map((point, index) => (
                    <li key={index} className="line-clamp-1">{point}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  Job Board ID: {job.adId}
                </Badge>
                {job.portal?.hotJob && (
                  <Badge variant="destructive" className="text-xs">
                    Hot Job 🔥
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {job.category && (
                  <Badge variant="outline" className="text-xs">
                    {job.category.name}
                  </Badge>
                )}
                <Button size="sm" className="gap-1">
                  Apply Now
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};