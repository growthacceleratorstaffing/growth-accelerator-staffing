import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Calendar, Building, DollarSign, Users } from "lucide-react";
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
        <p className="text-muted-foreground text-lg">No job opportunities found matching your criteria.</p>
      </div>
    );
  }

  const formatSalary = (salary?: JobAdderJob['salary']) => {
    if (!salary) return null;
    
    const { rateLow, rateHigh, currency, ratePer } = salary;
    let salaryText = '';
    
    if (rateLow && rateHigh) {
      salaryText = `${currency} ${rateLow.toLocaleString()} - ${rateHigh.toLocaleString()}`;
    } else if (rateLow) {
      salaryText = `${currency} ${rateLow.toLocaleString()}+`;
    }
    
    if (ratePer && ratePer !== 'Year') {
      salaryText += ` per ${ratePer}`;
    }
    
    return salaryText;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently posted';
    return new Date(dateString).toLocaleDateString();
  };

  const getWorkTypeDisplay = (workType?: JobAdderJob['workType']) => {
    return workType?.name || 'Full-time';
  };

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
                  {job.company.name}
                </CardDescription>
                {job.reference && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Ref: {job.reference}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="ml-2">
                {getWorkTypeDisplay(job.workType)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {job.location.name}
                {job.location.area && ` (${job.location.area.name})`}
              </div>
              
              {job.salary && (
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <DollarSign className="h-4 w-4" />
                  {formatSalary(job.salary)}
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Posted: {formatDate(job.postAt)}
              </div>

              {job.expireAt && (
                <div className="text-xs text-muted-foreground">
                  Expires: {formatDate(job.expireAt)}
                </div>
              )}
            </div>
            
            {job.summary && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {job.summary}
              </p>
            )}

            {job.bulletPoints && job.bulletPoints.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1">
                {job.bulletPoints.slice(0, 3).map((point, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-secondary">•</span>
                    <span className="line-clamp-1">{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {job.category && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {job.category.name}
                  {job.category.subCategory && ` - ${job.category.subCategory.name}`}
                </Badge>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {job.owner ? `${job.owner.firstName} ${job.owner.lastName}` : 'HR Team'}
              </div>
              <Button size="sm" className="bg-secondary hover:bg-secondary/90">
                Apply Now
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};